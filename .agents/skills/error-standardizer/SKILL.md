---
name: error-standardizer
description: >
  Error handling standardization agent for converting inconsistent error patterns to emit_error().
triggers:
  - standardize errors
  - fix error handling
  - error patterns
  - convert to emit_error
---

# Error Standardizer Skill

Identifies inconsistent error handling patterns in shell and Python and converts them to the standardized `emit_error()` pattern from `error-json.sh` / `lib.layer1.error_json`.

## Before You Begin — Load Reference Docs

Read the following reference file(s) before proceeding with any workflow step:

- Read `references/error-patterns.md` — Reference patterns for consistent error handling across CLI scripts.

## Parameters

| Parameter | Required | Description | Example |
|-----------|:--------:|-------------|---------|
| `TASK_ID` | Yes | Current task identifier | `5` |
| `DATE` | Yes | Current date (YYYY-MM-DD) | `2026-03-03` |
| `SLUG` | Yes | URL-safe topic name | `error-standardization` |
| `TARGET_FILES` | No | Files to analyze | `lib/*.sh scripts/*.sh` |
| `EXIT_CODES_FILE` | No | Exit codes definition | `lib/exit-codes.sh` |
| `ERROR_JSON_FILE` | No | Error emitter | `lib/error-json.sh` |
| `EPIC_ID` | No | Parent epic identifier | — |
| `SESSION_ID` | No | Session identifier | — |
| `OUTPUT_DIR` | Injected | Output directory | `.orchestrate/<SESSION_ID>/logs/` |
| `MANIFEST_PATH` | Injected | Path to MANIFEST.jsonl | — |

---

## Execution Flow

1. Get task → set status `in_progress`
2. Scan for non-standard error patterns (shell + Python)
3. Catalog findings with file, line, current pattern
4. Map to exit code constants
5. Generate conversion plan → obtain user approval
6. Execute conversions, verify imports/sources present
7. Run tests → write report to `{{OUTPUT_DIR}}/{{DATE}}_{{SLUG}}.md`
8. Append manifest entry → set status `completed`

---

## Exit Code Reference

Defined in `lib/exit-codes.sh` (shell) and `lib/layer0/exit_codes.py` (Python):

| Constant | Value | Meaning |
|----------|:-----:|---------|
| `E_SUCCESS` | 0 | Success |
| `E_GENERAL` | 1 | Unspecified error |
| `E_USAGE` | 2 | Invalid arguments |
| `E_NOT_FOUND` | 3 | Resource missing |
| `E_VALIDATION` | 4 | Data validation failed |
| `E_PERMISSION` | 5 | Permission denied |
| `E_IO` | 6 | I/O error |
| `E_CONFLICT` | 7 | Resource conflict |
| `E_INTERNAL` | 8 | Internal error |

---

## Standard Patterns

### Shell — `emit_error`

```bash
source "${LIB_DIR:-lib}/error-json.sh"
source "${LIB_DIR:-lib}/exit-codes.sh"

emit_error <message> <exit_code> [<key> <value>]...
# Example:
emit_error "File not found" "$E_NOT_FOUND" "file" "$file"
```

### Python — `emit_error`

```python
from lib.layer1.error_json import emit_error
from lib.layer0.exit_codes import E_NOT_FOUND

emit_error(message: str, exit_code: int, **context) -> NoReturn
# Example:
emit_error("File not found", E_NOT_FOUND, file=file_path)
```

---

## Non-Standard Patterns to Convert

### Shell

| Pattern | Example | Problem |
|---------|---------|---------|
| Direct echo | `echo "Error: not found"` | Not machine-parseable |
| Raw exit | `exit 1` | Hardcoded, undocumented |
| stderr redirect | `>&2 echo "..."` | No structure |

### Python

| Pattern | Example | Problem |
|---------|---------|---------|
| Bare raise | `raise Exception("...")` | No structured context |
| Print to stderr | `print("Error:", file=sys.stderr)` | Not machine-parseable |
| Hardcoded exit | `sys.exit(1)` | Undocumented code |
| Broad catch | `except Exception:` | Catches too broadly |

---

## Conversion Examples

### Shell: Before → After

```bash
# BEFORE
if [[ ! -f "$file" ]]; then
    echo "Error: File not found: $file" >&2
    exit 1
fi

# AFTER
if [[ ! -f "$file" ]]; then
    emit_error "File not found" "$E_NOT_FOUND" "file" "$file"
fi
```

### Python: Before → After

```python
# BEFORE
if not os.path.isfile(file_path):
    print(f"Error: File not found: {file_path}", file=sys.stderr)
    sys.exit(1)

# AFTER
if not os.path.isfile(file_path):
    emit_error("File not found", E_NOT_FOUND, file=file_path)
```

---

## Detection

### Automated Scanner

```bash
python scripts/error_pattern_detector.py src/ -o json              # Full scan
python scripts/error_pattern_detector.py --exclude "*test*" src/   # Skip tests
python scripts/error_pattern_detector.py src/ -o json | jq '.recommendations'
```

### Manual grep patterns

```bash
# Shell: non-standard errors
grep -rn 'echo.*[Ee]rror' lib/*.sh scripts/*.sh | grep -v 'emit_error'
grep -rn 'exit [0-9]' lib/*.sh scripts/*.sh | grep -v 'exit 0' | grep -v '\$E_'
grep -rn '>&2' lib/*.sh scripts/*.sh | grep -v 'emit_error'

# Python: non-standard errors
grep -rn "raise\s" lib/layer*/*.py | grep -v "emit_error"
grep -rn "sys.exit([0-9])" lib/layer*/*.py
grep -rn 'print.*stderr' lib/layer*/*.py | grep -v 'emit_error'
grep -rn "except Exception:" lib/layer*/*.py
```

---

## Output Format

Write to `{{OUTPUT_DIR}}/{{DATE}}_{{SLUG}}.md`:

1. **Summary** — Files scanned, non-standard patterns found, hardcoded exit codes, files needing changes
2. **Non-Standard Patterns** — Tables by category (direct echo, hardcoded exits, missing sources) with file:line, current pattern, and suggested fix
3. **Conversion Plan** — Prioritized list: high priority (critical paths), medium (libraries)
4. **Exit Code Mapping** — Table of error types mapped to constants
5. **Linked Tasks** — Epic ID, Task ID

---

## Skill Chaining

| Direction | Skills | Pattern |
|-----------|--------|---------|
| Consumes from | `security-auditor` | Vulnerability list, risk assessment for prioritization |
| Produces for | `validator` | Standardization report, converted source files |

---

## Anti-Patterns

| Don't | Why | Do Instead |
|-------|-----|------------|
| Partial conversion within a file | Inconsistent error handling in same file | Convert all patterns in a file at once |
| Use `E_GENERAL` for everything | Loses error specificity | Map to the most specific exit code |
| Call `emit_error` without sourcing | Runtime failure | Add source/import at file top |
| Emit errors without a message | Silent, undebuggable failures | Always include a descriptive message |

---

## Constraints

- Summary message on completion: `"Error standardization complete. See MANIFEST.jsonl for summary."`
- Obtain user approval before executing conversions
- Run tests after conversion to verify no regressions