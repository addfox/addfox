---
name: hierarchy-unifier
description: >
  Hierarchy consolidation agent for unifying scattered parent-child task operations
  into a single cohesive interface.
triggers:
  - unify hierarchy
  - consolidate parent operations
  - hierarchy refactor
---

# Hierarchy Unifier Skill

Identifies scattered hierarchy-related code (parent-child task relationships) and consolidates it into a unified interface with consistent naming, error handling, and return values.

## Parameters

| Parameter | Required | Description | Example |
|-----------|:--------:|-------------|---------|
| `TASK_ID` | Yes | Current task identifier | `5` |
| `DATE` | Yes | Current date (YYYY-MM-DD) | `2026-03-03` |
| `SLUG` | Yes | URL-safe topic name | `hierarchy-unification` |
| `EPIC_ID` | No | Parent epic identifier | — |
| `SESSION_ID` | No | Session identifier | — |
| `OUTPUT_DIR` | Injected | Output directory | `.orchestrate/<SESSION_ID>/logs/` |
| `MANIFEST_PATH` | Injected | Path to MANIFEST.jsonl | — |

---

## Execution Flow

1. Get task → set status `in_progress`
2. Discover all hierarchy-related functions
3. Catalog with locations, callers, dependencies, inconsistencies
4. Design unified interface → create consolidation plan
5. Obtain user approval → execute consolidation
6. Run tests → write report to `{{OUTPUT_DIR}}/{{DATE}}_{{SLUG}}.md`
7. Append manifest entry → set status `completed`

---

## Target Patterns

Functions to consolidate:

| Pattern | Typical Locations | Purpose |
|---------|-------------------|---------|
| `get_parent_*` | task-ops.sh, validation.sh | Retrieve parent task |
| `set_parent_*` | add-task.sh, update-task.sh | Set parent relationship |
| `get_children_*` | task-ops.sh, list.sh | Get child tasks |
| `validate_parent_*` | validation.sh | Validate hierarchy |
| `move_to_parent_*` | update-task.sh | Reparent task |
| `calculate_depth_*` | task-ops.sh | Tree depth calculation |

---

## Discovery

### Automated Scanners

```bash
# Discover all functions
python scripts/function_discoverer.py lib/ -o json > functions.json

# Analyze naming consistency
python scripts/consistency_analyzer.py functions.json --style snake_case -o human

# Exclude test files
python scripts/function_discoverer.py --exclude "*test*" src/ -o json
```

### Manual grep

```bash
# Parent-related functions
grep -rn "parent" lib/*.sh scripts/*.sh | grep -E "(function|^[a-z_]+\(\))" | grep -v "^#"

# Hierarchy/tree functions
grep -rn -E "(hierarchy|tree|depth|ancestor|descendant)" lib/*.sh scripts/*.sh
```

---

## Unified Interface Design

### Shell — `lib/hierarchy-unified.sh`

```bash
# Core operations
hierarchy_get_parent(task_id)              # Returns parent_id or ""
hierarchy_set_parent(task_id, parent_id)   # Sets parent, validates first
hierarchy_get_children(task_id)            # Returns JSON array of child IDs
hierarchy_get_ancestors(task_id)           # Returns array of ancestor IDs
hierarchy_get_descendants(task_id)         # Returns array of descendant IDs
hierarchy_get_depth(task_id)               # Returns tree depth (0 = root)

# Validation
hierarchy_validate_parent(task_id, parent_id)  # Check if valid parent
hierarchy_detect_cycle(task_id, parent_id)     # Check for cycles

# Bulk operations
hierarchy_reparent(task_id, new_parent_id)     # Move to new parent
hierarchy_orphan(task_id)                       # Remove parent relationship
```

### Python — `lib/layer3/hierarchy_unified.py`

```python
from lib.layer3.hierarchy_unified import (
    get_parent, set_parent, get_children,
    get_ancestors, get_descendants, get_depth,
    validate_parent, detect_cycle, reparent, orphan
)

parent_id = get_parent(task_id)          # str or ""
set_parent(task_id, parent_id)           # Validates + sets
children = get_children(task_id)         # List[str]
ancestors = get_ancestors(task_id)       # List[str]
depth = get_depth(task_id)               # int
is_valid = validate_parent(task_id, parent_id)  # bool
has_cycle = detect_cycle(task_id, parent_id)    # bool
reparent(task_id, new_parent_id)
orphan(task_id)
```

**Naming convention**: Shell uses `hierarchy_{operation}_{target}`. Python drops the prefix since the module name provides namespace.

---

## Library Template

```bash
#!/usr/bin/env bash
# hierarchy-unified.sh — Unified task hierarchy operations

[[ -n "${_HIERARCHY_UNIFIED_LOADED:-}" ]] && return 0
readonly _HIERARCHY_UNIFIED_LOADED=1

source "${LIB_DIR:-lib}/logging.sh"
source "${LIB_DIR:-lib}/file-ops.sh"

# Get parent task ID
# Args: $1=task_id | Returns: 0 on success | Stdout: parent_id or ""
hierarchy_get_parent() {
    local task_id="$1"
    # Implementation
}

# Set parent with validation and cycle detection
# Args: $1=task_id, $2=parent_id | Returns: 0=success, 1=invalid, 2=cycle
hierarchy_set_parent() {
    local task_id="$1" parent_id="$2"
    hierarchy_validate_parent "$task_id" "$parent_id" || return 1
    hierarchy_detect_cycle "$task_id" "$parent_id" && return 2
    # Set parent
}
```

---

## Migration Plan

1. Create `lib/hierarchy-unified.sh` (and Python equivalent)
2. Implement unified functions
3. Update `task-ops.sh` to source and delegate
4. Update `validation.sh` to use unified validation
5. Deprecate scattered functions with warnings
6. Run full test suite

---

## Output Format

Write to `{{OUTPUT_DIR}}/{{DATE}}_{{SLUG}}.md`:

1. **Current State** — Table of scattered functions (name, file:line, callers) and inconsistencies found
2. **Unified Interface** — Proposed API with naming, parameters, return values
3. **Migration Plan** — Ordered steps with affected files
4. **Linked Tasks** — Epic ID, Task ID

---

## Skill Chaining

| Direction | Skills | Pattern |
|-----------|--------|---------|
| Consumes from | `dependency-analyzer` | Coupling analysis, layer violations |
| Produces for | `validator` | Unified library, consolidation report |

---

## Anti-Patterns

| Don't | Why | Do Instead |
|-------|-----|------------|
| Partial migration | Some callers use old API, some new | Complete migration in one pass |
| Breaking changes without warning | Callers break silently | Add deprecation warnings first |
| Skip tests before migration | Regressions go undetected | Require test coverage before starting |
| Over-abstract the interface | Simple becomes complex | Keep the API minimal |

---

## Constraints

- Obtain user approval before executing consolidation
- Summary message: `"Hierarchy unification complete. See MANIFEST.jsonl for summary."`