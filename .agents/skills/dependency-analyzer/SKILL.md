---
name: dependency-analyzer
description: Dependency analysis agent for detecting circular dependencies and validating architecture layers.
triggers:
  - check dependencies
  - find circular imports
  - analyze layers
  - dependency graph
  - layer violations
---

# Dependency Analyzer Skill

Analyze source dependencies across shell and Python modules, detect circular imports, and validate layered architecture constraints.

## Before You Begin — Load Reference Docs

Read the following reference file(s) before proceeding with any workflow step:

- Read `references/layer-rules.md` — Strict layered import rules that prevent circular dependencies and define which layers may import from which.

## Capabilities

- **Dependency Parsing** — Extract `source` statements (shell) and `import` statements (Python)
- **Graph Building** — Construct adjacency-list dependency graphs
- **Cycle Detection** — Find circular dependency paths via DFS
- **Layer Validation** — Verify Layer N depends only on Layer < N
- **Coupling Analysis** — Flag tightly coupled modules

---

## Quick Start

```bash
# Parse dependencies
python scripts/dependency_parser.py -o json . > deps.json

# Build + visualize graph
python scripts/graph_builder.py deps.json -o dot > deps.dot
dot -Tpng deps.dot -o deps.png

# Validate layer architecture
python scripts/layer_validator.py --config layers.json lib/
```

| Script                  | Purpose                              |
| ----------------------- | ------------------------------------ |
| `dependency_parser.py`  | Parse package files for dependencies |
| `graph_builder.py`      | Build dependency graph from parsed data |
| `layer_validator.py`    | Validate imports against layer rules |

---

## Architecture Layers

```
Layer 3  Orchestration    → may import 0, 1, 2
Layer 2  Business Logic   → may import 0, 1
Layer 1  Basic Helpers    → may import 0
Layer 0  Foundation       → stdlib only
```

### Shell Modules

| Layer | Modules |
| ----- | ------- |
| 0 | `exit-codes.sh`, `colors.sh`, `constants.sh` |
| 1 | `logging.sh`, `error-json.sh`, `config.sh`, `file-ops.sh` |
| 2 | `validation.sh`, `task-*.sh`, `phase-*.sh`, `session-*.sh` |
| 3 | `migrate.sh`, `backup.sh`, `doctor.sh` |

### Python Modules

| Layer | Modules |
| ----- | ------- |
| 0 | `layer0/exit_codes.py`, `layer0/colors.py`, `layer0/constants.py` |
| 1 | `layer1/logging.py`, `layer1/error_json.py`, `layer1/config.py`, `layer1/file_ops.py`, `layer1/output_format.py` |
| 2 | `layer2/validation.py`, `layer2/task_ops.py` |
| 3 | `layer3/migrate.py`, `layer3/backup.py`, `layer3/doctor.py`, `layer3/hierarchy_unified.py` |

---

## Analysis Workflow

### 1. Extract Dependencies

**Shell** — parse `source` / `.` statements:

```bash
grep -E "^[[:space:]]*(source|\\.)[[:space:]]+" "$FILE" | \
  sed -E 's/.*source[[:space:]]+["'\''"]?([^"'\''"]*)["'\''"]?.*/\1/' | \
  sed 's|${LIB_DIR:-lib}/||; s|"${PROJECT_ROOT}"/lib/||'
```

**Python** — parse `from lib.` / `import lib.` / relative imports:

```bash
grep -rn "^from lib\.\|^import lib\.\|^from \.\|^from \.\." lib/layer*/*.py
```

### 2. Build Graph

Construct an adjacency list mapping each file to its dependencies:

```json
{
  "validation.sh": ["logging.sh", "file-ops.sh", "error-json.sh"],
  "task-ops.sh": ["validation.sh", "logging.sh"]
}
```

### 3. Detect Cycles

DFS from each node, tracking the current path. A node visited twice in the same path is a cycle.

### 4. Validate Layers

For each dependency: if `dependency_layer >= source_layer`, flag as a violation.

---

## Validation Rules

| Rule | Severity | Condition |
| ---- | -------- | --------- |
| No circular dependencies | CRITICAL | Any cycle → FAIL |
| Layer constraints | HIGH | Layer N sourcing Layer ≥ N → FAIL |
| Max coupling | MEDIUM | > 7 dependents or > 7 dependencies → WARNING |
| Orphan detection | LOW | 0 dependents → dead code candidate |

---

## Report Template

```markdown
# Dependency Analysis Report

## Summary

| Metric                 | Value       |
| ---------------------- | ----------- |
| Total Files            | {N}         |
| Total Dependencies     | {N}         |
| Circular Dependencies  | {N}         |
| Layer Violations       | {N}         |
| **Status**             | PASS / FAIL |

## Dependency Graph

​```mermaid
graph TD
  A[validation.sh] --> B[logging.sh]
  A --> C[file-ops.sh]
  B --> D[colors.sh]
​```

## Circular Dependencies

Cycle 1: `A.sh → B.sh → C.sh → A.sh`
Resolution: {recommendation}

## Layer Violations

| Source File | Layer | Depends On | Dep Layer | Violation          |
| ----------- | ----- | ---------- | --------- | ------------------ |
| {file}      | {N}   | {dep}      | {N}       | Upward dependency  |

## Coupling Analysis

| Module | Dependents | Dependencies | Coupling Score |
| ------ | ---------- | ------------ | -------------- |
| {file} | {N}        | {N}          | {score}        |

## Recommendations

1. {Specific recommendation with file names}
```

---

## Context Variables

| Token                | Description          | Example                    |
| -------------------- | -------------------- | -------------------------- |
| `{{TARGET_DIR}}`     | Directory to analyze | `lib/`                     |
| `{{LAYER_CONFIG}}`   | Layer definitions    | JSON object                |
| `{{EXCLUDE_PATTERNS}}`| Files to skip       | `["*test*", "*mock*"]`     |
| `{{SLUG}}`           | URL-safe topic name  | `dependency-audit`         |

---

## Anti-Patterns

| Pattern         | Problem                        | Fix                                    |
| --------------- | ------------------------------ | -------------------------------------- |
| Mutual sourcing | A sources B, B sources A       | Extract shared code to Layer 0         |
| Layer skipping  | L3 sources L0 directly         | Source through intermediate layers     |
| God module      | One file with 20+ dependents   | Split responsibilities                 |
| Deep chains     | A→B→C→D→E→F                   | Flatten and consolidate                |

---

## Skill Chaining

### Consumes

| Input      | From Skill       | Description                        |
| ---------- | ---------------- | ---------------------------------- |
| `metrics`  | `codebase-stats` | File metrics for prioritization    |
| `hotspots` | `codebase-stats` | High-change files to focus on      |

### Produces

| Output              | Format        | Description                              |
| ------------------- | ------------- | ---------------------------------------- |
| `coupling-analysis` | JSON/Markdown | Module coupling metrics                  |
| `layer-violations`  | JSON array    | Architecture constraint violations       |
| `dependency-graph`  | DOT/Mermaid   | Visual dependency graph                  |

### Downstream

`hierarchy-unifier` — consumes violations to consolidate and fix architecture issues.

---

## Checklist

- [ ] All `lib/layer*/*.py` files scanned
- [ ] Dependencies extracted (source + import)
- [ ] Dependency graph constructed
- [ ] Cycle detection completed
- [ ] Layer validation completed
- [ ] Coupling metrics calculated
- [ ] Report written with recommendations