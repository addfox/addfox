# Deployment Strategies Reference

## Quick Decision Matrix

| Strategy | Downtime | Risk | Rollback Speed | Resource Cost | Complexity | Best For |
|----------|----------|------|----------------|---------------|------------|----------|
| **Recreate** | Yes | High | Slow (full redeploy) | 1× | Low | Dev/test, incompatible versions |
| **Rolling** | No | Medium | Medium (~minutes) | 1.25× | Low | Standard production deploys |
| **Blue/Green** | No | Low | Instant (~seconds) | 2× | Medium | Mission-critical with instant rollback |
| **Canary** | No | Very Low | Fast (~seconds) | 1.1× | High | High-risk changes, gradual validation |
| **A/B Testing** | No | Low | Fast | 1.1–1.5× | High | User-facing experiments, conversions |
| **Feature Flags** | No | Very Low | Instant (code-level) | 1× | Medium | Decoupled release, kill switches |

### Strategy Selection Flowchart

```
Is downtime acceptable?
├─ YES → Recreate (simplest)
└─ NO → Do you need instant rollback?
         ├─ YES → Blue/Green (if budget allows 2× infra)
         └─ NO  → Is the change high-risk?
                   ├─ YES → Canary (gradual traffic shift)
                   └─ NO  → Rolling (default choice)
```

> **Rule of thumb:** Start with Rolling. Graduate to Canary for risky changes and Blue/Green for critical services where seconds of rollback time matter.

---

## 1. Recreate Deployment

Stops all old instances, then starts all new instances. The simplest strategy, but the only one with guaranteed downtime.

**When to use:**

- Dev/test environments where downtime is irrelevant
- The application cannot run two versions simultaneously (e.g., breaking DB schema migration with no backward compatibility)
- Stateful workloads with exclusive resource locks

**When to avoid:**

- Any production system with uptime SLAs
- Services with long startup times (compounds the outage window)

**Hidden risk:** If the new version fails to start, you have *zero* running instances. Always pair with a readiness probe and a pre-baked rollback image.

### Kubernetes Config

```yaml
spec:
  strategy:
    type: Recreate
```

### Pipeline Example

```yaml
# GitHub Actions
- name: Stop old version
  run: kubectl scale deployment app --replicas=0

- name: Deploy new version
  run: |
    kubectl set image deployment/app app=$NEW_IMAGE
    kubectl scale deployment app --replicas=3
    kubectl rollout status deployment/app
```

**Optimization tip:** Reduce downtime by pre-pulling the new image on all nodes before starting the recreate:

```bash
kubectl create daemonset image-prepull --image=$NEW_IMAGE -- /bin/true
kubectl rollout status daemonset/image-prepull
kubectl delete daemonset image-prepull
# Now Recreate will be much faster since the image is cached
```

---

## 2. Rolling Deployment

Incrementally replaces old pods with new ones. The Kubernetes default and the workhorse of most production systems.

**When to use:**

- Standard production deployments (this should be your default)
- Zero-downtime requirement with moderate risk tolerance
- Application supports running mixed versions simultaneously

**When to avoid:**

- Database schema changes that break backward compatibility
- Changes that require all instances to flip simultaneously (e.g., protocol changes)

**Critical prerequisite:** Your application *must* handle both old and new versions coexisting. This means APIs must be backward-compatible and shared state (DB, cache) must work for both versions during the transition window.

### Kubernetes Config

```yaml
spec:
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 25%        # Max extra pods during update
      maxUnavailable: 25%  # Max pods that can be unavailable
```

### Tuning Profiles

| Profile | maxSurge | maxUnavailable | Behavior | Use Case |
|---------|----------|----------------|----------|----------|
| **Conservative** | 1 | 0 | One new pod must be healthy before any old pod terminates | Safety-first; latency-sensitive services |
| **Balanced** | 25% | 25% | Kubernetes default; reasonable speed/safety tradeoff | General production |
| **Aggressive** | 50% | 50% | Fast rollout; half the fleet can be in-flight | Low-risk patches, large fleets |
| **Zero-risk** | 1 | 0 | Slowest; guarantees capacity never drops | Payment processing, auth services |

**Key insight:** `maxUnavailable: 0` means your cluster capacity *never dips below current* during a rollout — critical for services under heavy load. The tradeoff is speed: a 100-pod deployment with `maxSurge: 1, maxUnavailable: 0` takes 100 sequential cycles.

### Pipeline Example

```yaml
- name: Rolling deploy
  run: |
    kubectl set image deployment/app app=$NEW_IMAGE
    kubectl rollout status deployment/app --timeout=10m

- name: Rollback on failure
  if: failure()
  run: kubectl rollout undo deployment/app
```

### Rolling Deploy Anti-Patterns

- **No readiness probes:** Kubernetes marks pods "Ready" immediately, sending traffic to a half-initialized app. Always configure `readinessProbe`.
- **No PodDisruptionBudget:** Without a PDB, node drains during a rollout can take too many pods offline at once.
- **Ignoring `terminationGracePeriodSeconds`:** Default 30s may not be enough for long-lived connections. Set it to match your longest expected request + buffer.

---

## 3. Blue/Green Deployment

Two full environments exist simultaneously. Traffic is switched atomically from one to the other.

**When to use:**

- Need instant rollback (one selector change restores the old version)
- Must test the full production environment before cutting over
- Critical applications where partial failures during rolling updates are unacceptable

**When to avoid:**

- Budget-constrained environments (requires 2× infrastructure)
- Databases with schema migrations (both environments share state — the DB is the hard part)
- Very large deployments where 2× cost is prohibitive

**The hard truth about Blue/Green:** The strategy is elegant for stateless services, but database changes break the model. If v2 requires schema changes, you can't simply flip back to v1 without also reverting the DB. Solution: Use expand-and-contract migrations — v2's schema must be backward-compatible with v1's code.

### Architecture

```
        ┌─────────────────────────────────────────┐
        │            Load Balancer                │
        └──────────────┬──────────────────────────┘
                       │
              selector: version=blue
                       │
           ┌───────────┴───────────┐
           │                       │
    ┌──────┴──────┐         ┌──────┴──────┐
    │  BLUE (v1)  │         │ GREEN (v2)  │
    │  [ACTIVE]   │         │ [STANDBY]   │
    │  3 replicas │         │ 3 replicas  │
    └─────────────┘         └─────────────┘
```

### Kubernetes Implementation

```yaml
# blue-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-blue
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
      version: blue
  template:
    metadata:
      labels:
        app: myapp
        version: blue
    spec:
      containers:
        - name: app
          image: myapp:1.0.0
---
# green-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-green
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
      version: green
  template:
    metadata:
      labels:
        app: myapp
        version: green
    spec:
      containers:
        - name: app
          image: myapp:2.0.0
---
# service.yaml — the switchover happens here
apiVersion: v1
kind: Service
metadata:
  name: app
spec:
  selector:
    app: myapp
    version: blue   # ← Change to 'green' to switch traffic
  ports:
    - port: 80
```

### Pipeline Implementation

```yaml
deploy-blue-green:
  steps:
    - name: Deploy to inactive environment
      run: |
        ACTIVE=$(kubectl get svc app -o jsonpath='{.spec.selector.version}')
        TARGET=$([ "$ACTIVE" = "blue" ] && echo "green" || echo "blue")
        echo "TARGET=$TARGET" >> $GITHUB_ENV

        kubectl set image deployment/app-$TARGET app=$NEW_IMAGE
        kubectl rollout status deployment/app-$TARGET

    - name: Smoke test inactive environment
      run: |
        POD=$(kubectl get pod -l version=$TARGET -o name | head -1)
        kubectl exec $POD -- curl -f http://localhost/health

    - name: Switch traffic
      run: |
        kubectl patch svc app -p \
          '{"spec":{"selector":{"version":"'$TARGET'"}}}'

    - name: Verify live traffic
      run: curl -f https://app.example.com/health

    - name: Rollback on failure
      if: failure()
      run: |
        OLD=$([ "$TARGET" = "green" ] && echo "blue" || echo "green")
        kubectl patch svc app -p \
          '{"spec":{"selector":{"version":"'$OLD'"}}}'
```

### Blue/Green Operational Checklist

- [ ] Pre-warm the standby environment (connections, caches, JIT)
- [ ] Run integration tests against standby *before* switching
- [ ] Verify DNS TTL is low enough for fast propagation if using DNS-based switching
- [ ] Keep the old environment running for at least one rollback window (e.g., 30 min)
- [ ] Ensure session affinity/stickiness won't strand users on the old environment

---

## 4. Canary Deployment

Routes a small slice of real production traffic to the new version. The blast radius starts tiny and expands only after validation.

**When to use:**

- High-risk changes (major refactors, new dependencies, performance-sensitive code)
- You need real production signal before committing to a full rollout
- You want automated, metric-driven promotion decisions

**When to avoid:**

- Changes that are all-or-nothing (e.g., protocol changes requiring all clients to update)
- Very low-traffic services where 10% canary gets statistically insignificant sample sizes

**Key insight:** Canary deploys are only as good as your observability. If you can't measure error rates, latency percentiles, and business metrics *per-version*, you're flying blind — a canary without monitoring is just a slow rolling update.

### Architecture

```
        ┌─────────────────────────────────────────┐
        │            Load Balancer                │
        │         90% ──────────── 10%            │
        └─────────────────────────────────────────┘
           │                          │
    ┌──────┴──────┐           ┌───────┴───────┐
    │  Stable v1  │           │  Canary v2    │
    │  (3 pods)   │           │   (1 pod)     │
    └─────────────┘           └───────────────┘
```

### Nginx Ingress Canary

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: app-canary
  annotations:
    nginx.ingress.kubernetes.io/canary: "true"
    nginx.ingress.kubernetes.io/canary-weight: "10"
spec:
  rules:
    - host: app.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: app-canary
                port:
                  number: 80
```

### Progressive Canary Pipeline

```yaml
canary-deploy:
  steps:
    - name: Deploy canary (10%)
      run: |
        kubectl apply -f k8s/canary-deployment.yaml
        kubectl patch ingress app-canary -p \
          '{"metadata":{"annotations":{"nginx.ingress.kubernetes.io/canary-weight":"10"}}}'

    - name: Monitor canary (5 min bake time)
      run: |
        for i in {1..30}; do
          ERROR_RATE=$(curl -s "$PROMETHEUS/api/v1/query?query=..." \
            | jq '.data.result[0].value[1]')
          if (( $(echo "$ERROR_RATE > 0.05" | bc -l) )); then
            echo "::error::Error rate $ERROR_RATE exceeds 5% threshold"
            exit 1
          fi
          sleep 10
        done

    - name: Promote to 50%
      run: |
        kubectl patch ingress app-canary -p \
          '{"metadata":{"annotations":{"nginx.ingress.kubernetes.io/canary-weight":"50"}}}'

    - name: Monitor (5 min bake time)
      run: ./scripts/monitor-canary.sh

    - name: Full rollout
      run: |
        kubectl set image deployment/app app=$NEW_IMAGE
        kubectl rollout status deployment/app
        kubectl delete -f k8s/canary-deployment.yaml
        kubectl delete ingress app-canary

    - name: Rollback on failure
      if: failure()
      run: |
        kubectl delete -f k8s/canary-deployment.yaml || true
        kubectl delete ingress app-canary || true
```

### Argo Rollouts (Declarative Canary)

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: app
spec:
  replicas: 5
  strategy:
    canary:
      steps:
        - setWeight: 10
        - pause: { duration: 5m }
        - setWeight: 30
        - pause: { duration: 5m }
        - setWeight: 60
        - pause: { duration: 5m }
      canaryMetadata:
        labels:
          role: canary
      stableMetadata:
        labels:
          role: stable
```

### Recommended Canary Promotion Schedule

| Stage | Traffic % | Bake Time | Gate Criteria |
|-------|-----------|-----------|---------------|
| 1 | 5–10% | 5–10 min | Error rate < 1%, p99 latency within 2× baseline |
| 2 | 25–30% | 10–15 min | Same + no anomalies in business metrics |
| 3 | 50% | 15–30 min | Same + comparable throughput per pod |
| 4 | 100% | — | Full rollout, tear down canary infra |

**Statistical note:** At 10% canary with 1,000 req/min total, you get ~100 req/min to canary. You need roughly 5 minutes to detect a 5% error rate increase with 95% confidence. Low-traffic services should extend bake times accordingly or use synthetic traffic to supplement.

---

## 5. Feature Flags

Deploy code with features toggled off. Enable for specific users, percentages, or segments without redeploying.

**When to use:**

- Decouple deployment from release (deploy anytime, release when ready)
- A/B testing and experimentation
- Need a kill switch for risky features in production
- Trunk-based development

**When to avoid:**

- Infrastructure-level changes (feature flags operate at code level)
- Temporary workaround for lacking a proper deployment strategy

**The hidden cost:** Feature flags are technical debt that compounds. Every flag is a code branch that must be tested in both states. Enforce a hygiene policy: flags should have an owner, an expiry date, and a cleanup ticket created at flag-creation time.

### Application Integration

```typescript
// Runtime check
if (featureFlags.isEnabled('new-checkout', { userId, region, plan })) {
  return newCheckoutFlow();
} else {
  return oldCheckoutFlow();
}
```

### Gradual Rollout via API (LaunchDarkly Example)

```yaml
- name: Enable feature for 10% of users
  run: |
    curl -X PATCH \
      "https://app.launchdarkly.com/api/v2/flags/project/new-checkout" \
      -H "Authorization: $LD_API_KEY" \
      -d '{
        "patch": [{
          "op": "replace",
          "path": "/environments/production/rollout",
          "value": {
            "variations": [
              { "variation": 0, "weight": 10000 },
              { "variation": 1, "weight": 90000 }
            ]
          }
        }]
      }'
```

### Feature Flag Lifecycle

```
Created → Testing → Gradual Rollout → 100% Enabled → Flag Removed (code cleanup)
                                                        ↑
                                               Target: < 30 days
```

---

## 6. Rollback Strategies

Every deployment strategy must have a tested rollback plan. Untested rollback plans are not rollback plans.

### Kubernetes Built-in Rollback

```bash
# Undo last deployment
kubectl rollout undo deployment/app

# Rollback to specific revision
kubectl rollout undo deployment/app --to-revision=2

# View rollout history
kubectl rollout history deployment/app

# Check a specific revision's details
kubectl rollout history deployment/app --revision=3
```

**Important:** Kubernetes keeps only `revisionHistoryLimit` revisions (default: 10). If you need to roll back further, you need image tags or GitOps.

### Automated Rollback Pipeline

```yaml
- name: Deploy with auto-rollback
  run: |
    # Snapshot current state
    kubectl get deployment app -o yaml > previous.yaml

    # Deploy
    kubectl set image deployment/app app=$NEW_IMAGE

    # Wait for rollout with timeout
    if ! kubectl rollout status deployment/app --timeout=5m; then
      echo "::error::Rollout failed, restoring previous state"
      kubectl apply -f previous.yaml
      exit 1
    fi

    # Post-deploy health check
    for i in {1..5}; do
      if curl -sf https://app.example.com/health; then
        echo "Health check passed"
        exit 0
      fi
      sleep 5
    done
    echo "::error::Health check failed after deploy"
    kubectl rollout undo deployment/app
    exit 1
```

### Automated Rollback Triggers

| Signal | Threshold | Response | Rationale |
|--------|-----------|----------|-----------|
| HTTP 5xx rate | > 5% for 2 min | Auto rollback | Clear breakage |
| p99 latency | > 2× baseline for 5 min | Alert → manual decision | Could be transient load |
| Health probe | 3 consecutive failures | Auto rollback | Pod is unhealthy |
| CrashLoopBackOff | > 3 restarts | Halt rollout | Code-level crash |
| Memory/CPU | > 90% sustained 5 min | Alert → investigate | Possible leak or resource issue |
| Business metric | Conversion drop > 10% | Alert → manual decision | Needs human judgment |

**Key principle:** Automate rollback for clear infrastructure signals (crashes, 5xx spikes). Use human judgment for ambiguous business metrics — an apparent drop may be a sampling artifact or seasonal effect.

---

## 7. Environment Promotion Pipeline

```
┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
│   Dev   │────▶│   QA    │────▶│ Staging │────▶│  Prod   │
└─────────┘     └─────────┘     └─────────┘     └─────────┘
  Auto on         Auto on         Auto on         Manual
  feature         develop         main            approval
  branch          merge           merge           required
```

### Promotion Rules

```yaml
deploy-dev:
  environment: development
  rules:
    - if: $CI_COMMIT_BRANCH =~ /^feature\//

deploy-qa:
  environment: qa
  needs: [deploy-dev]
  rules:
    - if: $CI_COMMIT_BRANCH == "develop"

deploy-staging:
  environment: staging
  needs: [deploy-qa]
  rules:
    - if: $CI_COMMIT_BRANCH == "main"

deploy-production:
  environment: production
  needs: [deploy-staging]
  when: manual    # Human gate before prod
  rules:
    - if: $CI_COMMIT_BRANCH == "main"
```

### Promotion Best Practices

- **Immutable artifacts:** Build the image once, promote the same SHA through every environment. Never rebuild per environment.
- **Config separation:** Same image, different config. Use ConfigMaps, environment variables, or a secrets manager — never bake config into the image.
- **Staging ≈ Production:** Staging should mirror prod topology (replica count can differ, but architecture should not). The closer staging is to prod, the more useful it is.
- **Soak time:** Hold in staging for a minimum window (e.g., 24h for weekly releases) before promoting to prod. This catches slow-burn issues like memory leaks.

---

## 8. Cross-Cutting Concerns

### Health Checks — The Foundation of Every Strategy

Every deployment strategy relies on health checks to make decisions. Get these wrong and no strategy will save you.

```yaml
# Liveness: "Is the process alive?" Failure → restart the pod.
livenessProbe:
  httpGet:
    path: /healthz
    port: 8080
  initialDelaySeconds: 15   # Wait for startup
  periodSeconds: 10
  failureThreshold: 3       # 3 failures → restart

# Readiness: "Can it serve traffic?" Failure → remove from LB.
readinessProbe:
  httpGet:
    path: /ready
    port: 8080
  periodSeconds: 5
  failureThreshold: 2

# Startup: "Has it finished initializing?" (K8s 1.18+)
startupProbe:
  httpGet:
    path: /healthz
    port: 8080
  failureThreshold: 30
  periodSeconds: 10         # Up to 300s to start
```

**Common mistake:** Making the liveness probe hit a dependency (DB, cache). If the DB goes down, *all* pods restart in a cascade — making recovery harder, not easier. Liveness should check the process itself. Readiness should check dependencies.

### Graceful Shutdown

```yaml
spec:
  terminationGracePeriodSeconds: 60
  containers:
    - lifecycle:
        preStop:
          exec:
            command: ["/bin/sh", "-c", "sleep 5"]
            # Allows LB to drain connections before SIGTERM
```

### Pod Disruption Budgets

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: app-pdb
spec:
  minAvailable: 2        # Or use maxUnavailable: 1
  selector:
    matchLabels:
      app: myapp
```

---

## 9. Strategy Combinations (Advanced)

Production systems often combine strategies for defense in depth:

| Combination | How It Works | Example |
|-------------|-------------|---------|
| **Canary + Feature Flags** | Deploy canary with flag disabled, enable flag only for canary traffic | Test new checkout on 5% of users via canary; kill the flag instantly if metrics drop |
| **Blue/Green + Canary** | Deploy Green, canary 10% of traffic to Green, then full switch | Get canary's gradual validation with Blue/Green's instant rollback |
| **Rolling + Feature Flags** | Roll out code with flag off, then enable flag gradually | Fully separate "deploy" from "release"; rollback is just a flag toggle |
| **Canary + A/B Testing** | Route canary traffic based on user segments | Test new pricing page on 10% of US users only |

> **The golden pattern for high-stakes releases:** Deploy the code behind a feature flag (rolling deploy, zero risk). Enable the flag for internal users. Then canary to 5%, 25%, 50%, 100% — with automated metric gates at each stage. Rollback at any point is a flag toggle, not a redeploy.