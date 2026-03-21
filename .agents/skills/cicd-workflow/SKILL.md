---
name: cicd-workflow
description: |
  CI/CD pipeline creation, deployment automation, and troubleshooting for GitHub Actions and GitLab CI.
  Use when user says "CI pipeline", "CD pipeline", "GitHub Actions", "GitLab CI",
  "deployment automation", "pipeline debugging", "deployment pipeline", "workflow file".
triggers:
  - CI pipeline
  - CD pipeline
  - GitHub Actions
  - GitLab CI
  - deployment automation
  - pipeline debugging
  - deployment pipeline
  - workflow file
---

# CI/CD Workflow Skill

Patterns, templates, and references for building CI pipelines, deployment automation, and debugging pipeline issues.

## Before You Begin — Load Reference Docs

Read all of the following reference files before proceeding with any workflow step:

- Read `references/github-actions.md` — GitHub Actions patterns and best practices.
- Read `references/gitlab-ci.md` — GitLab CI patterns and best practices.
- Read `references/deployment-strategies.md` — Deployment strategy patterns.
- Read `references/troubleshooting.md` — Common CI/CD issues and solutions.

## Overview

This skill provides:
- **CI Patterns** - Build, test, lint pipeline configurations
- **CD Patterns** - Deployment strategies and environment promotion
- **Platform Templates** - GitHub Actions, GitLab CI configurations
- **Troubleshooting** - Common issues and solutions

## Used By

This skill is referenced by:
- Orchestrator agents - Via Task tool delegation
- DevOps workflows requiring pipeline configuration

## Core Principles

> **ALL pipelines MUST be fast, reliable, secure, and provide clear feedback.**

---

## Parameters (Orchestrator-Provided)

| Parameter | Description | Required |
|-----------|-------------|----------|
| `{{TASK_ID}}` | Current task identifier | Yes |
| `{{DATE}}` | Current date (YYYY-MM-DD) | Yes |
| `{{SLUG}}` | URL-safe topic name | Yes |
| `{{PLATFORM}}` | Target platform (github-actions, gitlab-ci) | Yes |
| `{{WORKFLOW_TYPE}}` | Type of workflow (ci, cd, full) | No |
| `{{EPIC_ID}}` | Parent epic identifier | No |
| `{{SESSION_ID}}` | Session identifier | No |

---

## Task System Integration

@_shared/templates/skill-boilerplate.md#task-integration

### Execution Sequence

1. Get task via `TaskGet`
2. Set focus via `TaskUpdate` (status: in_progress)
3. Execute CI/CD workflow (create, debug, or optimize)
4. Write output to `{{OUTPUT_DIR}}/{{DATE}}_{{SLUG}}.md`
5. Append manifest entry to `{{MANIFEST_PATH}}`
6. Complete task via `TaskUpdate` (status: completed)
7. Return summary message only

---

## Quick Reference

### GitHub Actions

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm test
      - run: npm run build
```

### GitLab CI

```yaml
# .gitlab-ci.yml
stages:
  - build
  - test
  - deploy

build:
  stage: build
  image: node:20
  script:
    - npm ci
    - npm run build
  artifacts:
    paths:
      - dist/

test:
  stage: test
  image: node:20
  script:
    - npm ci
    - npm test

deploy:
  stage: deploy
  script:
    - ./deploy.sh
  only:
    - main
```

## Pipeline Structure

### CI Pipeline

```
+---------+   +---------+   +---------+   +---------+
|  Lint   |-->|  Build  |-->|  Test   |-->| Security|
+---------+   +---------+   +---------+   +---------+
```

### CD Pipeline

```
+---------+   +---------+   +---------+   +---------+
|   CI    |-->|   Dev   |-->| Staging |-->|  Prod   |
|  Build  |   | Deploy  |   | Deploy  |   | Deploy  |
+---------+   +---------+   +---------+   +---------+
                  |             |             |
                  v             v             v
               Auto on       Auto on       Manual
               develop        main         Approval
```

## Deployment Strategies

| Strategy | Description | Risk | Downtime |
|----------|-------------|------|----------|
| **Rolling** | Gradual replacement | Low | None |
| **Blue/Green** | Full environment swap | Medium | None |
| **Canary** | Small % first | Low | None |
| **Recreate** | Stop old, start new | High | Yes |

## Caching by Language

| Language | Cache Key | Cache Path |
|----------|-----------|------------|
| **Node.js** | `package-lock.json` | `~/.npm` |
| **Python** | `requirements.txt` | `~/.cache/pip` |
| **Java** | `pom.xml`/`build.gradle` | `~/.m2`/`~/.gradle` |
| **Go** | `go.sum` | `~/go/pkg/mod` |
| **Rust** | `Cargo.lock` | `~/.cargo` |

## Security Checklist

- [ ] Secrets in platform secret storage (not in code)
- [ ] Minimal permissions for CI token
- [ ] Dependencies scanned for vulnerabilities
- [ ] No secrets logged in output
- [ ] Branch protection enabled
- [ ] Required reviews for production deploys

---

## Subagent Protocol

@_shared/templates/skill-boilerplate.md#subagent-protocol

**Summary message:** "CI/CD workflow complete. See MANIFEST.jsonl for summary."

---

## Output File Format

Write to `{{OUTPUT_DIR}}/{{DATE}}_{{SLUG}}.md`:

```markdown
# CI/CD Workflow Report: {{SLUG}}

## Summary

- **Platform:** {{PLATFORM}}
- **Workflow Type:** {{CI|CD|FULL}}
- **Status:** {{SUCCESS|PARTIAL|BLOCKED}}

## Configuration

### Workflow File

{{Workflow file content or path}}

## Pipeline Stages

| Stage | Description | Status |
|-------|-------------|--------|
| {{Stage}} | {{Description}} | {{PASS|FAIL|SKIP}} |

## Security Checklist Results

| Check | Status | Notes |
|-------|--------|-------|
| {{Check}} | {{PASS|FAIL}} | {{Notes}} |

## Recommendations

1. {{Recommendation 1}}
2. {{Recommendation 2}}

## Linked Tasks

- Epic: {{EPIC_ID}}
- Task: {{TASK_ID}}
```

---

## Manifest Entry

@_shared/templates/skill-boilerplate.md#manifest-entry

**CI/CD-specific fields:**
- `key_findings`: Pipeline configuration and security checklist results
- `actionable`: `true` if security issues or optimizations found

---

## Completion Checklist

@_shared/templates/skill-boilerplate.md#completion-checklist

### Skill-Specific Items

- [ ] Workflow file created/updated
- [ ] Security checklist completed
- [ ] Caching configured
- [ ] Secrets properly stored

---

## Error Handling

@_shared/templates/skill-boilerplate.md#error-handling

**Skill-specific messages:**
- Partial: "CI/CD workflow partial. See MANIFEST.jsonl for details."
- Blocked: "CI/CD workflow blocked. See MANIFEST.jsonl for blocker details."

---

## File Structure

```
claude-code/
└── skills/
    └── cicd-workflow/
        ├── SKILL.md              # This file
        └── references/
            ├── github-actions.md
            ├── gitlab-ci.md
            ├── deployment-strategies.md
            └── troubleshooting.md
```

## Common Workflows

### New Project CI Setup

1. Analyze project -> Create CI pipeline -> Add caching -> Configure quality gates

### Add Deployment

1. Configure environments -> Add secrets -> Set up approvals -> Create deployment jobs

### Debug Pipeline Failure

1. Classify problem -> Check logs -> Identify root cause -> Fix

## References

- `references/github-actions.md` - GitHub Actions patterns and best practices
- `references/gitlab-ci.md` - GitLab CI patterns and best practices
- `references/deployment-strategies.md` - Deployment strategy patterns
- `references/troubleshooting.md` - Common issues and solutions
