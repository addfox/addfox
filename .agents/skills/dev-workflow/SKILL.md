---
name: dev-workflow
description: Atomic commits, conventional commit messages, and release management.
triggers:
  - commit
  - release
  - run the workflow
  - prepare release
  - atomic commit
  - version bump
  - ship it
---

# Development Workflow Skill

Ensure proper atomic commits with task traceability, conventional commit messages, and systematic release processes.

> **CRITICAL**: No code changes or commits without a tracked task.

---

## Immutable Rules

| ID     | Rule               | Detail                                    |
| ------ | ------------------ | ----------------------------------------- |
| WF-001 | Task required      | No commits without task reference          |
| WF-002 | Branch discipline  | No commits to main/master                 |
| WF-003 | Atomic commits     | One logical change per commit              |
| WF-004 | Conventional format| `<type>(<scope>): <description>`           |
| WF-005 | Tests before push  | Relevant tests must pass                   |
| WF-006 | No auto-commit/push| Generate commands for user to run manually |

---

## Commit Message Format

```
<type>(<scope>): <description>

<body explaining why>

Task: #ID
Co-Authored-By: Claude <noreply@anthropic.com>
```

**Example:**

```
fix(auth): prevent token expiry race condition

The refresh token was being invalidated before the new access
token was validated, causing intermittent auth failures.

Task: #1456
Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## Change Types

| Type       | Description       | Test Scope              | Version Bump |
| ---------- | ----------------- | ----------------------- | ------------ |
| `feat`     | New feature       | Related module tests    | MINOR        |
| `fix`      | Bug fix           | Regression + affected   | PATCH        |
| `docs`     | Documentation     | None (CI validates)     | None         |
| `refactor` | Code restructure  | Affected module tests   | PATCH        |
| `test`     | Test additions    | The new tests only      | None         |
| `chore`    | Maintenance       | Syntax check only       | None         |
| `perf`     | Performance       | Perf tests              | PATCH        |
| `security` | Security fix      | Security tests          | PATCH        |

Run the **full suite** locally only for releases, major refactors, cross-cutting changes, or when the user explicitly requests it. Otherwise rely on CI.

---

## Gate System

### G0: Pre-Flight (always required)

1. Verify focused task via `TaskList` (status: `in_progress`)
2. Confirm branch is not main/master: `git branch --show-current`
3. Review uncommitted work: `git status --porcelain`

### G1: Test (smart scope)

```bash
# Targeted (typical)
bats tests/unit/specific-feature.bats

# Syntax check (chore/docs)
bash -n scripts/*.sh lib/*.sh

# Full suite (release/major refactor only)
./tests/run-all-tests.sh
```

### G2: Stage & Generate Commit

Stage specific files for atomic commits, then **display** (do not execute) the commit command:

```
**Commit message:**
type(scope): description

body

Task: #ID
Co-Authored-By: Claude <noreply@anthropic.com>

**To commit, run:**
git add file1 file2
git commit -m "$(cat <<'EOF'
type(scope): description

body

Task: #ID
Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

### G3: Push Instructions

Display for the user — do not execute:

```
git push origin HEAD
```

### G4: Version Bump (release only)

```bash
./dev/bump-version.sh --dry-run patch   # preview
./dev/bump-version.sh patch             # execute
./dev/validate-version.sh               # validate
```

### G5: Tag & Release

```bash
git tag -a v${VERSION} -m "${TYPE}: ${SUMMARY}"
git push origin v${VERSION}
git push origin HEAD
# GitHub Actions creates the release automatically
```

---

## Release Sequence

```bash
# 1. Ensure all changes merged to main
# 2. Edit CHANGELOG.md with release notes
git add CHANGELOG.md
git commit -m "docs(changelog): Add v0.X.Y release notes"
git push origin main

# 3. (Auto) docs-update.yml creates Mintlify PR → review & merge

# 4. Version bump
./dev/bump-version.sh minor && ./dev/validate-version.sh
git add -A
git commit -m "chore: bump version to v0.X.Y"
git push origin main

# 5. Tag (triggers release.yml)
git tag -a v0.X.Y -m "feat: Description of release"
git push origin v0.X.Y
# → GitHub Actions builds tarball, creates Release, uploads artifacts
```

---

## CI/CD Pipelines

| Trigger                     | Workflow              | Actions                                          |
| --------------------------- | --------------------- | ------------------------------------------------ |
| Push/PR to main             | `ci.yml`              | Tests, lint, JSON validation, docs drift, install |
| Push to main (CHANGELOG.md) | `docs-update.yml`     | Auto-PR for Mintlify changelog regeneration       |
| Tag push (v*.*.*)           | `release.yml`         | Build tarball, create GitHub Release, upload       |
| Push to docs/               | `mintlify-deploy.yml` | Validate MDX, check required files                |

---

## Branch Strategy

```
main → feature/T123-description → PR → main
```

Subagents share the parent session's branch — all work is sequential, not parallel. Naming: `feature/T123-auth-improvements`, `fix/T456-token-validation`.

---

## Workflow Examples

### Bug Fix

1. Verify in-progress task via `TaskList`
2. Make changes
3. `bats tests/unit/auth.bats`
4. Display commit command (G2) → user runs manually
5. Display push command (G3) → user runs manually
6. `TaskUpdate` → `status: completed`

### New Feature

Same flow, but run both unit and integration tests for the feature, and stage test files alongside implementation files.

### Release

1. Confirm no pending tasks via `TaskList`
2. Run full test suite
3. Follow the release sequence above
4. GitHub Actions creates the release

### Documentation Only

Same as bug fix flow, but skip local tests entirely (CI validates).

---

## Task Tool Integration

| Action       | Tool         | Key Fields                                   |
| ------------ | ------------ | -------------------------------------------- |
| List tasks   | `TaskList`   | —                                            |
| Get details  | `TaskGet`    | task ID                                      |
| Create task  | `TaskCreate` | subject, description, activeForm             |
| Update task  | `TaskUpdate` | status, addBlockedBy, addBlocks              |

---

## Anti-Patterns

| Pattern                   | Fix                                     |
| ------------------------- | --------------------------------------- |
| No task reference         | Create/find task first                  |
| Committing to main        | Use feature branches                    |
| Running full tests always | Use smart test scope; let CI do the rest|
| Giant commits             | One logical change per commit           |
| Vague commit messages     | Conventional format + task ref          |
| Auto-committing/pushing   | Generate commands for user to execute   |
| Manual release creation   | Use tag → GitHub Actions                |