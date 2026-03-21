# CI/CD Troubleshooting Guide

## Build Failures

### "npm ci" / "npm install" Failures

| Error | Cause | Solution |
|-------|-------|----------|
| `npm ERR! code ERESOLVE` | Dependency conflict | Delete `package-lock.json`, run `npm install`, commit |
| `npm ERR! code ENOENT` | File not found | Check file paths, ensure checkout step ran |
| `npm ERR! code E401` | Unauthorized | Check NPM_TOKEN secret is set |
| `npm ERR! code EINTEGRITY` | Checksum mismatch | Clear npm cache, regenerate lock file |

**Debug:**
```yaml
- name: Debug npm
  run: |
    npm config list
    cat package-lock.json | head -50
    npm ci --verbose
```

### Python Build Failures

| Error | Cause | Solution |
|-------|-------|----------|
| `ModuleNotFoundError` | Missing dependency | Add to requirements.txt |
| `pip: command not found` | Python not set up | Add setup-python action |
| `ERROR: Could not build wheels` | Missing build tools | Install build-essential |

**Debug:**
```yaml
- name: Debug Python
  run: |
    python --version
    pip --version
    pip list
    pip install -v package-name
```

### Java/Gradle/Maven Failures

| Error | Cause | Solution |
|-------|-------|----------|
| `Could not resolve dependencies` | Missing repo or artifact | Check repository URLs, credentials |
| `Compilation failure` | Code errors | Fix compilation errors |
| `OutOfMemoryError` | Insufficient heap | Increase `JAVA_OPTS` |

**Debug:**
```yaml
- name: Debug Java
  run: |
    java -version
    ./gradlew dependencies --info
```

## Test Failures

### Tests Pass Locally, Fail in CI

**Common Causes:**

1. **Version mismatch**
   ```yaml
   # Pin exact versions
   - uses: actions/setup-node@v4
     with:
       node-version: '20.11.0'  # Exact version, not just '20'
   ```

2. **Environment variables**
   ```yaml
   - name: Debug environment
     run: env | sort | grep -E 'NODE|CI|PATH'
   ```

3. **Timezone differences**
   ```yaml
   env:
     TZ: UTC  # Match CI timezone
   ```

4. **File system case sensitivity**
   - macOS/Windows: case-insensitive
   - Linux (CI): case-sensitive
   - Fix: Use correct case in imports

5. **Missing services**
   ```yaml
   services:
     postgres:
       image: postgres:16
   ```

### Flaky Tests

**Identify:**
```yaml
- name: Run tests multiple times
  run: |
    for i in {1..10}; do
      npm test || echo "Attempt $i failed"
    done
```

**Retry mechanism:**
```yaml
- uses: nick-fields/retry@v2
  with:
    timeout_minutes: 10
    max_attempts: 3
    command: npm test
```

### Timeout Issues

```yaml
jobs:
  test:
    timeout-minutes: 30  # Job timeout
    steps:
      - name: Long running tests
        timeout-minutes: 20  # Step timeout
        run: npm test
```

## Deployment Failures

### Authentication Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `401 Unauthorized` | Bad/expired credentials | Rotate secrets, check expiration |
| `403 Forbidden` | Insufficient permissions | Check IAM roles/permissions |
| `KUBECONFIG invalid` | Bad kubeconfig | Regenerate kubeconfig, check context |

**Debug:**
```yaml
- name: Debug auth
  run: |
    # AWS
    aws sts get-caller-identity

    # Kubernetes
    kubectl config view
    kubectl auth can-i create deployments

    # Docker
    docker info
```

### Container Issues

| Error | Cause | Solution |
|-------|-------|----------|
| `ImagePullBackOff` | Can't pull image | Check registry auth, image exists |
| `CrashLoopBackOff` | Container crashing | Check app logs, fix crash |
| `ErrImagePull` | Image not found | Verify image name/tag, push first |

**Debug:**
```yaml
- name: Debug container
  run: |
    kubectl describe pod -l app=myapp
    kubectl logs -l app=myapp --previous
    kubectl get events --sort-by='.lastTimestamp'
```

### Health Check Failures

```yaml
- name: Debug health
  run: |
    # Wait for deployment
    kubectl rollout status deployment/app --timeout=5m

    # Get pod
    POD=$(kubectl get pod -l app=myapp -o name | head -1)

    # Check from inside
    kubectl exec $POD -- curl -v http://localhost:8080/health

    # Check from outside
    kubectl port-forward $POD 8080:8080 &
    sleep 5
    curl -v http://localhost:8080/health
```

## Permissions Issues

### GitHub Actions Permissions

```yaml
# Resource not accessible by integration
permissions:
  contents: read
  packages: write
  pull-requests: write
  issues: write
  id-token: write  # For OIDC
```

### Cannot Push to Protected Branch

```yaml
# Option 1: Use PAT instead of GITHUB_TOKEN
- uses: actions/checkout@v4
  with:
    token: ${{ secrets.PAT }}

# Option 2: Create PR instead of direct push
- name: Create PR
  uses: peter-evans/create-pull-request@v5
```

### Secrets Not Available

**In forks:**
- Secrets not passed to workflows from forks (security)
- Use `pull_request_target` with caution

**Check secrets:**
```yaml
- name: Check secrets
  run: |
    if [ -z "${{ secrets.MY_SECRET }}" ]; then
      echo "Secret not set!"
      exit 1
    fi
```

## Cache Issues

### Cache Not Hitting

**Debug:**
```yaml
- uses: actions/cache@v4
  id: cache
  with:
    path: node_modules
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}

- name: Cache status
  run: echo "Cache hit: ${{ steps.cache.outputs.cache-hit }}"
```

**Common causes:**
1. Key includes changing values (timestamp, run ID)
2. Lock file changed
3. Different OS/runner

### Cache Corrupted

```yaml
# Force cache miss
- uses: actions/cache@v4
  with:
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}-${{ github.run_id }}
```

Or delete via GitHub UI: Actions -> Caches -> Delete

## Performance Issues

### Slow Builds

**Diagnose:**
```yaml
- name: Timing
  run: |
    START=$(date +%s)
    npm run build
    echo "Build took $(($(date +%s) - START)) seconds"
```

**Optimize:**
1. **Enable caching**
2. **Parallel jobs** where possible
3. **Skip unchanged** (path filters)
4. **Larger runner** for heavy builds
5. **Incremental builds**

### Resource Limits

```yaml
# GitHub-hosted runner limits
# ubuntu-latest: 2 vCPU, 7GB RAM, 14GB SSD
# windows-latest: 2 vCPU, 7GB RAM, 14GB SSD
# macos-latest: 3 vCPU, 14GB RAM, 14GB SSD

# For more resources, use larger runners or self-hosted
runs-on: ubuntu-latest-4-cores
```

## Debugging Techniques

### Enable Debug Logging

**GitHub Actions:**
```yaml
# Set in repository secrets
ACTIONS_STEP_DEBUG: true
ACTIONS_RUNNER_DEBUG: true
```

**GitLab CI:**
```yaml
variables:
  CI_DEBUG_TRACE: "true"
```

### SSH Debug Session

```yaml
# GitHub Actions - tmate
- name: SSH debug
  if: failure()
  uses: mxschmitt/action-tmate@v3
  with:
    limit-access-to-actor: true
    detached: true
```

### Print Context

```yaml
- name: Dump context
  run: |
    echo "GitHub context:"
    echo '${{ toJSON(github) }}'

    echo "Job context:"
    echo '${{ toJSON(job) }}'

    echo "Steps context:"
    echo '${{ toJSON(steps) }}'
```

## Quick Reference

### Re-run Commands

```bash
# GitHub CLI
gh run rerun [run-id]
gh run rerun [run-id] --failed  # Only failed jobs
gh run rerun [run-id] --debug

# View logs
gh run view [run-id] --log
gh run view [run-id] --log-failed
```

### Common Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | General error |
| 2 | Misuse of command |
| 126 | Permission problem |
| 127 | Command not found |
| 128+ | Fatal error (128 + signal) |
| 130 | Ctrl+C |
| 137 | Killed (OOM or timeout) |
| 143 | Terminated (SIGTERM) |

### Skip CI

```bash
# Git commit message
git commit -m "docs: update readme [skip ci]"
git commit -m "chore: formatting [ci skip]"
git commit -m "fix: typo [no ci]"
```

### Force Clean Build

```yaml
- uses: actions/checkout@v4
  with:
    clean: true

- run: |
    git clean -ffdx
    rm -rf node_modules
    npm ci
```
