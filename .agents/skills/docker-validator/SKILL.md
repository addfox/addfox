---
name: docker-validator
description: >
  Docker environment validation agent for Stage 5 compliance. Validates Docker
  availability, captures pre-test state, runs Compose build/deploy, tests HTTP
  endpoints (authenticated and unauthenticated), detects 4xx/5xx errors, and
  restores Docker state to pre-test baseline.
triggers:
  - docker validate
  - docker test
  - validate containers
  - docker compliance
  - container validation
  - docker health check
  - docker endpoint test
  - compose validation
  - docker state audit
  - docker teardown
---

# Docker Validator Skill

A Stage 5 sub-component that validates Docker environments, tests containerized endpoints, and guarantees clean state restoration.

## Parameters

| Parameter | Required | Description | Example |
|-----------|:--------:|-------------|---------|
| `SESSION_ID` | Yes | Session identifier for file scoping | `auto-orc-20260303-docker-v` |
| `TASK_ID` | Yes | Current task identifier | `5` |
| `DATE` | Yes | Current date (YYYY-MM-DD) | `2026-03-03` |
| `SLUG` | Yes | URL-safe topic name | `docker-validation` |
| `COMPOSE_PATH` | Yes | Path to `docker-compose.yml` | `./docker-compose.yml` |
| `BASE_URL` | Yes | Base URL for endpoint testing | `http://localhost:8080` |
| `HEALTHCHECK_ENDPOINT` | No | Healthcheck path | `/health` |
| `AUTH_ENDPOINT` | No | Auth endpoint for token retrieval | `http://localhost:8080/api/auth/login` |
| `AUTH_CREDENTIALS` | No | Credentials JSON (never log to output) | `{"username":"test","password":"test"}` |
| `EPIC_ID` | No | Parent epic identifier | `auto-orc-20260303-docker-v` |
| `OUTPUT_DIR` | Injected | Output directory | `.orchestrate/<SESSION_ID>/logs/` |
| `MANIFEST_PATH` | Injected | Manifest file path | `.orchestrate/<SESSION_ID>/MANIFEST.jsonl` |

---

## Execution Flow

1. Get task → set status `in_progress`
2. Run Phases 1–8 (halt on failure, always run Phase 8)
3. Write report to `{{OUTPUT_DIR}}/{{DATE}}_{{SLUG}}.md`
4. Append manifest entry
5. Set status `completed` → return summary

**Failure rule**: If any phase (1–7) fails, skip remaining phases and jump to Phase 8 (State Restoration). Record the failure in the Phase Results table.

---

## Phase 1: Environment Check

Verify Docker Engine, Compose, and daemon are operational.

```bash
DOCKER_VERSION=$(docker version --format '{{.Server.Version}}' 2>/dev/null) || { echo "FAIL: Docker daemon unreachable"; exit 1; }
docker info --format '{{.ServerVersion}}' 2>/dev/null || { echo "FAIL: Docker info unavailable"; exit 1; }
docker compose version 2>/dev/null || { echo "FAIL: Docker Compose not installed"; exit 1; }
```

**Version enforcement**:

```bash
MINIMUM_VERSION="27.1.1"
RECOMMENDED_VERSION="28.5.2"

if [[ "$(printf '%s\n' "$MINIMUM_VERSION" "$DOCKER_VERSION" | sort -V | head -n1)" != "$MINIMUM_VERSION" ]]; then
  echo "FAIL: Docker $DOCKER_VERSION < minimum $MINIMUM_VERSION (CVE-2024-41110 AuthZ bypass)"; exit 1
fi
if [[ "$(printf '%s\n' "$RECOMMENDED_VERSION" "$DOCKER_VERSION" | sort -V | head -n1)" != "$RECOMMENDED_VERSION" ]]; then
  echo "WARN: Docker $DOCKER_VERSION < recommended $RECOMMENDED_VERSION (runc CVE patches)"
fi
```

All three checks must exit 0. On failure, skip to Phase 8.

---

## Phase 2: State Audit

Capture pre-test Docker state as structured JSON.

```bash
PRE_CONTAINERS=$(docker ps -a --format '{{json .}}' | jq -s '.')
PRE_IMAGES=$(docker images --format '{{json .}}' | jq -s '.')
PRE_VOLUMES=$(docker volume ls --format '{{json .}}' | jq -s '.')
PRE_NETWORKS=$(docker network ls --format '{{json .}}' | jq -s '.')
```

Output structure:

```json
{
  "captured_at": "<ISO-8601>",
  "session_id": "{{SESSION_ID}}",
  "docker_version": "<version>",
  "containers": [],
  "images": [],
  "volumes": [],
  "networks": []
}
```

---

## Phase 3: Checkpoint Creation

Persist the snapshot for delta comparison during restoration.

```bash
mkdir -p .orchestrate/{{SESSION_ID}}/logs
echo "$SNAPSHOT_JSON" > .orchestrate/{{SESSION_ID}}/logs/docker-checkpoint.json
```

File must be valid, readable JSON. Abort with `BLOCKED` status on write failure.

---

## Phase 4: Build & Deploy

```bash
docker compose -f {{COMPOSE_PATH}} build
docker compose -f {{COMPOSE_PATH}} up -d --wait
```

The compose file must exist and be valid. All services should define a `healthcheck:` block; `--wait` gates on healthcheck passage. Use `depends_on: condition: service_healthy` for upstream deps.

On failure, record error output and proceed to Phase 8.

---

## Phase 5: UX Testing (Unauthenticated)

Test public endpoints, expecting `200` or `302`.

```bash
ERRORS=0
ENDPOINTS=("/" "{{HEALTHCHECK_ENDPOINT}}" "/api/status")

for EP in "${ENDPOINTS[@]}"; do
  HTTP_CODE=$(curl -o /dev/null -s -w "%{http_code}" "{{BASE_URL}}${EP}")
  if [[ "$HTTP_CODE" != "200" && "$HTTP_CODE" != "302" ]]; then
    echo "FAIL: ${EP} → ${HTTP_CODE}"; ERRORS=$((ERRORS + 1))
  else
    echo "PASS: ${EP} → ${HTTP_CODE}"
  fi
done
```

Any `4xx` or `5xx` response is a FAIL.

---

## Phase 6: UX Testing (Authenticated)

**Skip condition**: If `AUTH_ENDPOINT` or `AUTH_CREDENTIALS` is not provided, skip with note: "Authenticated testing skipped — no credentials provided."

```bash
# Obtain token
TOKEN=$(curl -s -X POST "{{AUTH_ENDPOINT}}" \
  -H "Content-Type: application/json" \
  -d '{{AUTH_CREDENTIALS}}' | jq -r '.token // .access_token // .jwt')
[[ -n "$TOKEN" && "$TOKEN" != "null" ]] || { echo "FAIL: No auth token"; ERRORS=$((ERRORS + 1)); }

# GET (expect 200)
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $TOKEN" "{{BASE_URL}}/api/profile")
[[ "$HTTP_CODE" == "200" ]] || { echo "FAIL: GET /api/profile → $HTTP_CODE"; ERRORS=$((ERRORS + 1)); }

# POST (expect 201)
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"docker-validator-test"}' "{{BASE_URL}}/api/items")
[[ "$HTTP_CODE" == "201" ]] || { echo "FAIL: POST /api/items → $HTTP_CODE"; ERRORS=$((ERRORS + 1)); }
```

**Expected codes**: GET → `200`, POST → `201`, PUT → `201`. Any `4xx`/`5xx` is a FAIL.

---

## Phase 7: HTTP Validation Summary

Aggregate all results from Phases 5–6 into a table:

```markdown
| # | Endpoint     | Method | Auth | Status | Expected | Result |
|---|-------------|--------|------|--------|----------|--------|
| 1 | /           | GET    | No   | 200    | 200/302  | PASS   |
| 2 | /health     | GET    | No   | 200    | 200      | PASS   |
| 3 | /api/profile| GET    | Yes  | 200    | 200      | PASS   |
| 4 | /api/items  | POST   | Yes  | 201    | 201      | PASS   |

Totals: 4 tested, 4 passed, 0 failed | 4xx: 0 | 5xx: 0
```

**Zero-error gate (MAIN-006)**: Any `4xx`/`5xx` response fails the overall validation.

---

## Phase 8: State Restoration

**Teardown** (non-negotiable):

```bash
docker compose -f {{COMPOSE_PATH}} down --volumes --remove-orphans
```

`--volumes` is **mandatory** — omitting it causes named volumes to persist and bleed state between runs. `--remove-orphans` removes containers for services not in the current compose file.

**Delta verification**: Re-capture state using the same Phase 2 commands. Compare counts against the Phase 3 checkpoint.

| Rule | Behavior |
|------|----------|
| Images increase | WARNING (build cache is expected) |
| Containers/volumes/networks differ | FAIL |

Report a delta table: Resource → Pre-Test Count → Post-Teardown Count → Delta → Status (`CLEAN`/`WARN`/`FAIL`).

Phase 8 is **always mandatory** after Phase 4 runs, even on failure.

---

## Security Requirements

| Concern | Requirement |
|---------|-------------|
| Docker Engine minimum | ≥ 27.1.1 — CVE-2024-41110 AuthZ bypass (CRITICAL) |
| Docker Engine recommended | ≥ 28.5.2 — CVE-2025-31133, CVE-2025-52565, CVE-2025-52881 runc escapes (HIGH) |
| Docker Desktop (if applicable) | ≥ 4.44.3 — CVE-2025-9074 API subnet access (HIGH) |
| docker Python SDK (if used) | ≥ 7.1.0 |
| Credential handling | `AUTH_CREDENTIALS` must never appear in output files — mask in reports |
| Socket mounting | `docker.sock` must not be mounted in test containers |
| Non-root containers | All test containers should run as non-root (CIS Docker Benchmark) |

---

## Output Format

Write to `{{OUTPUT_DIR}}/{{DATE}}_{{SLUG}}.md`:

1. **Summary** — Status (`PASS`/`PARTIAL`/`FAIL`), versions, compose path, endpoints tested, error/warning counts
2. **Phase Results** — Table: phase number, name, status (`PASS`/`FAIL`/`WARN`/`SKIPPED`), detail
3. **HTTP Validation Summary** — Per-endpoint table from Phase 7
4. **State Restoration** — Per-resource delta table from Phase 8
5. **Security Notes** — Version vs minimum/recommended, CVE status
6. **Linked Tasks** — Epic ID, Task ID, Session ID

---

## Manifest Entry

```json
{
  "id": "{{SLUG}}-{{DATE}}",
  "file": "{{DATE}}_{{SLUG}}.md",
  "title": "Docker Validation: {{SLUG}}",
  "date": "{{DATE}}",
  "status": "complete",
  "topics": ["docker", "validation", "containers", "endpoint-testing", "stage-5"],
  "key_findings": [
    "Docker Engine <version> validated (minimum 27.1.1)",
    "<N> endpoints tested: <passed> passed, <failed> failed",
    "State restoration: <CLEAN|WARN|FAIL>",
    "Security: <CVE status summary>"
  ],
  "actionable": true,
  "needs_followup": ["{{REMEDIATION_TASK_IDS}}"],
  "linked_tasks": ["{{EPIC_ID}}", "{{TASK_ID}}"]
}
```

---

## Skill Chaining

| Direction | Skills | Pattern |
|-----------|--------|---------|
| Consumes from | `docker-workflow`, `task-executor`, `implementer` | Compose config, deliverables |
| Produces for | `validator` | Validation report, checkpoint JSON |

This skill is a **quality-gate sub-component** — invoked by the `validator` skill as a mandatory sub-step when Docker is available.

---

## Anti-Patterns

| Don't | Why | Do Instead |
|-------|-----|------------|
| Test without state checkpoint | No baseline for delta comparison | Always run Phases 2–3 before Phase 4 |
| Skip teardown on failure | State bleed between runs | Always run Phase 8 |
| Ignore `4xx`/`5xx` responses | Silent endpoint failures | Fail validation on any error code |
| `docker compose down` without `--volumes --remove-orphans` | Volumes persist, orphans remain | Always use full teardown flags |
| Test against production endpoints | Risk of data corruption | Use only local/staging `BASE_URL` |
| Log `AUTH_CREDENTIALS` to reports | Credential exposure | Mask in all output |
| Use `docker stop` instead of `compose down` | Incomplete cleanup | Use Compose-level teardown |

---

## Constraints

- **MAIN-014**: Do not run `git commit`, `git push`, or any git write operation.
- Summary message on completion: `"Docker validation complete. See MANIFEST.jsonl for summary."`
- Partial: `"Docker validation partial. See MANIFEST.jsonl for details."`
- Blocked: `"Docker validation blocked. See MANIFEST.jsonl for blocker details."`