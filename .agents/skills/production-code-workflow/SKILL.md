---
name: production-code-workflow
description: |
  Multi-language production code patterns, detection scripts, and reference materials.
  Use when user says "implement", "production code", "no placeholders", "code review",
  "review code", "production ready", "TODO removal", "placeholder detection",
  "build feature", "write code", "implement feature", "coding standards".
triggers:
  - implement
  - production code
  - no placeholders
  - code review
  - review code
  - production ready
  - TODO removal
  - placeholder detection
  - build feature
  - write code
  - implement feature
  - coding standards
---

# Production Code Workflow Skill

Patterns, scripts, and references for implementing production-grade code with zero placeholders.

## Overview

This skill provides:
- **Detection Scripts** - Automated placeholder/anti-pattern scanning (64 patterns, 10 languages)
- **Implementation Patterns** - Production code examples by language
- **Review Checklists** - Language-specific review criteria
- **Research Queries** - Search strategies for debugging

## Used By

This skill is referenced by:
- `claude-code/agents/implementer.md` - Uses patterns and examples
- Orchestrator agents - Via Task tool delegation

## Core Principle

> **ALL code MUST be production-ready. Never output placeholders.**

---

## Parameters (Orchestrator-Provided)

| Parameter | Description | Required |
|-----------|-------------|----------|
| `{{TASK_ID}}` | Current task identifier | Yes |
| `{{DATE}}` | Current date (YYYY-MM-DD) | Yes |
| `{{SLUG}}` | URL-safe topic name | Yes |
| `{{SOURCE_DIR}}` | Directory to scan | Yes |
| `{{LANGUAGE}}` | Target language | No |
| `{{EPIC_ID}}` | Parent epic identifier | No |
| `{{SESSION_ID}}` | Session identifier | No |

---

## Task System Integration

@_shared/templates/skill-boilerplate.md#task-integration

### Execution Sequence

1. Get task via `TaskGet`
2. Set focus via `TaskUpdate` (status: in_progress)
3. Execute placeholder detection or generate implementation plan
4. Write output to `{{OUTPUT_DIR}}/{{DATE}}_{{SLUG}}.md`
5. Append manifest entry to `{{MANIFEST_PATH}}`
6. Complete task via `TaskUpdate` (status: completed)
7. Return summary message only

---

## Supported Languages

| Category | Languages |
|----------|-----------|
| **JVM** | Java, Scala, Kotlin |
| **.NET** | C#, F# |
| **Dynamic** | Python, Ruby, PHP |
| **JS/TS** | JavaScript, TypeScript |
| **Systems** | Go, Rust, C++ |

## Prohibited Patterns

### Universal (All Languages)

| Pattern | Required Action |
|---------|-----------------|
| `// TODO:` `# TODO:` | Implement the feature NOW |
| `// FIXME:` `# FIXME:` | Fix it NOW |
| `// In production...` | Implement production logic NOW |
| `// For now...` | Implement permanent solution |
| Empty function bodies | Implement full logic |
| Mock/Stub in production | Use real implementations |
| Hardcoded secrets | Use environment/config |
| Debug prints in production | Use proper logging |

### Language-Specific

| Language | Prohibited | Do Instead |
|----------|------------|------------|
| **Java** | `throw new UnsupportedOperationException()` | Implement method |
| **Java** | `System.out.println()` | Use SLF4J/Logback |
| **Scala** | `???` | Implement expression |
| **Scala** | `throw new NotImplementedError()` | Implement fully |
| **C#** | `throw new NotImplementedException()` | Implement method |
| **C#** | `Console.WriteLine()` | Use ILogger<T> |
| **Python** | `raise NotImplementedError()` | Implement method |
| **Python** | `pass` (empty body) | Implement logic |
| **TypeScript** | `throw new Error("Not implemented")` | Implement fully |
| **Go** | `panic("not implemented")` | Return error, implement |
| **Rust** | `todo!()` / `unimplemented!()` | Implement code |

## Scripts

### Placeholder Detection

```bash
# Scan directory
python scripts/detect_placeholders.py ./src --format text

# JSON output for CI/CD
python scripts/detect_placeholders.py ./src --format json --severity-threshold critical
```

**64 patterns** across severity levels:
- BLOCKER (7): Hardcoded secrets, SQL injection
- CRITICAL (23): Placeholders, empty implementations
- MAJOR (15): Debug logging, async issues
- MINOR (6): Magic numbers, missing docs

### Plan Generator

```bash
# Generate implementation plan
python scripts/generate_plan.py --feature "User Auth" --type api --language java

# Interactive mode
python scripts/generate_plan.py --interactive
```

---

## Subagent Protocol

@_shared/templates/skill-boilerplate.md#subagent-protocol

**Summary message:** "Placeholder scan complete. See MANIFEST.jsonl for summary."

---

## Output File Format

Write to `{{OUTPUT_DIR}}/{{DATE}}_{{SLUG}}.md`:

```markdown
# Placeholder Scan Report: {{SLUG}}

## Summary

- **Total Files Scanned:** {{FILE_COUNT}}
- **Total Issues Found:** {{ISSUE_COUNT}}
- **Severity Breakdown:** {{BLOCKER}} blocker, {{CRITICAL}} critical, {{MAJOR}} major, {{MINOR}} minor

## Issues by File

### {{FILE_PATH}}

| Line | Severity | Pattern | Code Snippet |
|------|----------|---------|--------------|
| {{LINE}} | {{SEVERITY}} | {{PATTERN}} | {{SNIPPET}} |

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

**Scan-specific fields:**
- `key_findings`: Summary of issues found by severity
- `actionable`: `true` if any issues require fixes

---

## Completion Checklist

@_shared/templates/skill-boilerplate.md#completion-checklist

### Skill-Specific Items

- [ ] All source files scanned
- [ ] Issues categorized by severity
- [ ] Recommendations provided for each issue type

---

## Error Handling

@_shared/templates/skill-boilerplate.md#error-handling

**Skill-specific messages:**
- Partial: "Placeholder scan partial. See MANIFEST.jsonl for details."
- Blocked: "Placeholder scan blocked. See MANIFEST.jsonl for blocker details."

---

## File Structure

```
claude-code/
├── agents/
│   └── implementer.md            # Fast implementation agent
└── skills/
    └── production-code-workflow/
        ├── SKILL.md              # This file
        ├── scripts/
        │   ├── detect_placeholders.py
        │   └── generate_plan.py
        └── references/
            ├── implementation-patterns.md
            ├── review-checklist.md
            └── research-queries.md
```

## Before You Begin — Load Reference Docs

Read all of the following reference files before proceeding with any workflow step:

- Read `references/implementation-patterns.md` — Production code patterns for 6 languages.
- Read `references/review-checklist.md` — Review criteria by language.
- Read `references/research-queries.md` — Search strategies and templates.
