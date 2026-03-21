---
name: docker-workflow
description: >
  Docker image building, container execution, and debugging patterns with security checklists.
triggers:
  - Docker
  - Dockerfile
  - container
  - containerize
  - docker-compose
  - docker compose
  - image build
  - multi-stage build
  - container debug
  - container crash
  - docker run
  - docker build
---

# Docker Workflow Skill

Patterns, templates, and references for building, running, and debugging Docker containers. Referenced by orchestrator agents and implementation workflows requiring containerization.

> **All containers MUST be production-ready: secure, resource-limited, and properly configured.**

## Before You Begin — Load Reference Docs

Read all of the following reference files before proceeding with any workflow step:

- Read `references/compose-patterns.md` — Production-ready Docker Compose configuration patterns and templates.
- Read `references/dockerfile-patterns.md` — Dockerfile patterns organized by programming language for multi-stage builds.
- Read `references/security-checklist.md` — Docker image and runtime security checklist covering base image, permissions, and secrets.
- Read `references/troubleshooting.md` — Common Docker build and runtime issues with diagnostic steps and fixes.

## Parameters

| Parameter | Required | Description |
|-----------|:--------:|-------------|
| `TASK_ID` | Yes | Current task identifier |
| `DATE` | Yes | Current date (YYYY-MM-DD) |
| `SLUG` | Yes | URL-safe topic name |
| `DOCKERFILE_PATH` | No | Path to Dockerfile |
| `COMPOSE_PATH` | No | Path to compose file |
| `EPIC_ID` | No | Parent epic identifier |
| `SESSION_ID` | No | Session identifier |
| `OUTPUT_DIR` | Injected | Output directory |
| `MANIFEST_PATH` | Injected | Path to MANIFEST.jsonl |

---

## Execution Flow

1. Get task → set status `in_progress`
2. Execute Docker workflow (build, run, or debug)
3. Write report to `{{OUTPUT_DIR}}/{{DATE}}_{{SLUG}}.md`
4. Append manifest entry → set status `completed`
5. Return summary message only

---

## Quick Reference

### Build

```bash
docker build -t app:1.0.0 .                                              # Standard
DOCKER_BUILDKIT=1 docker build -t app:1.0.0 .                            # BuildKit (faster)
docker buildx build --platform linux/amd64,linux/arm64 -t app:1.0.0 --push .  # Multi-platform
docker build --no-cache -t app:1.0.0 .                                   # Clean build
```

### Run

```bash
# Development
docker run -d -p 8080:8080 --name app-dev app:dev

# Production (full security options)
docker run -d --name app --restart unless-stopped \
  --security-opt no-new-privileges:true --cap-drop ALL --read-only \
  --cpus 2 --memory 2g -p 8080:8080 app:1.0.0
```

### Debug

```bash
docker logs -f [container]              # Logs
docker exec -it [container] /bin/sh     # Shell
docker inspect [container]              # Metadata
docker stats [container]                # Resource usage
```

---

## Multi-Stage Build Template

```dockerfile
# === Build Stage ===
FROM [build-image] AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

# === Runtime Stage ===
FROM [runtime-image] AS runtime
RUN addgroup -g 1001 app && adduser -u 1001 -G app -D app
USER app
WORKDIR /app
COPY --from=builder --chown=app:app /app/dist ./dist
COPY --from=builder --chown=app:app /app/node_modules ./node_modules

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

EXPOSE 8080
ENTRYPOINT ["node"]
CMD ["dist/main.js"]
```

### Base Images by Language

| Language | Build Stage | Runtime Stage |
|----------|-------------|---------------|
| Java | `eclipse-temurin:21-jdk` | `eclipse-temurin:21-jre-alpine` |
| Scala | `sbtscala/scala-sbt` | `eclipse-temurin:21-jre-alpine` |
| Node.js | `node:20-alpine` | `node:20-alpine` |
| Python | `python:3.12-slim` | `python:3.12-slim` |
| Go | `golang:1.22-alpine` | `scratch` or `gcr.io/distroless/static` |
| Rust | `rust:1.75-alpine` | `scratch` or `gcr.io/distroless/cc` |
| .NET | `mcr.microsoft.com/dotnet/sdk:8.0` | `mcr.microsoft.com/dotnet/aspnet:8.0-alpine` |

---

## Prohibited Patterns

| Don't | Why | Do Instead |
|-------|-----|------------|
| `FROM image:latest` | Unpredictable builds | Pin version: `image:1.2.3` |
| `USER root` in runtime | Security risk | Use non-root user |
| `ADD` for local files | Less explicit than COPY | Use `COPY` |
| Secrets in `ENV`/`ARG` | Exposed in image layers | Use runtime secrets |
| No resource limits | Resource exhaustion | Set `--cpus`, `--memory` |
| No health check | No visibility into service state | Add `HEALTHCHECK` |
| Default network | Less isolation | Use custom networks |

---

## Security Checklist

### Image

- [ ] Base image pinned to specific version
- [ ] Multi-stage build (no build tools in runtime)
- [ ] Non-root user configured
- [ ] No secrets in image layers
- [ ] Security scan passed (0 critical/high CVEs)
- [ ] `.dockerignore` excludes sensitive files

### Runtime

- [ ] `--security-opt=no-new-privileges:true`
- [ ] `--cap-drop=ALL` (add back only what's needed)
- [ ] `--read-only` (where possible)
- [ ] Resource limits set (CPU, memory)
- [ ] No Docker socket mounted
- [ ] Internal network for backend services

---

## Common Workflows

**New containerization**: Analyze app → Create Dockerfile → Optimize → Build → Configure compose → Set resources → Run → (if issues) Diagnose → Fix → Verify

**Debug failing container**: Classify problem → Gather logs → Identify root cause → Fix

**Production deployment**: Multi-stage build → Security scan → Tag → Production compose → Secrets → Resources → Health checks

---

## Output Format

Write to `{{OUTPUT_DIR}}/{{DATE}}_{{SLUG}}.md`:

1. **Summary** — Task type (`BUILD`/`RUN`/`DEBUG`), image name:tag, status (`SUCCESS`/`PARTIAL`/`BLOCKED`)
2. **Configuration** — Dockerfile and Compose content or paths
3. **Security Checklist Results** — Table: check, status (`PASS`/`FAIL`), notes
4. **Recommendations** — Numbered action items
5. **Linked Tasks** — Epic ID, Task ID

---

## Manifest Entry

```json
{
  "id": "{{SLUG}}-{{DATE}}",
  "file": "{{DATE}}_{{SLUG}}.md",
  "title": "Docker Workflow: {{SLUG}}",
  "date": "{{DATE}}",
  "status": "complete",
  "topics": ["docker", "containers"],
  "key_findings": ["Security checklist results and issues"],
  "actionable": true,
  "linked_tasks": ["{{EPIC_ID}}", "{{TASK_ID}}"]
}
```

---

## Constraints

- Summary message on completion: `"Docker workflow complete. See MANIFEST.jsonl for summary."`
- Partial: `"Docker workflow partial. See MANIFEST.jsonl for details."`
- Blocked: `"Docker workflow blocked. See MANIFEST.jsonl for blocker details."`