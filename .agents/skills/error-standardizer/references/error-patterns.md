# Error Standardization Patterns

Reference patterns for consistent error handling across CLI scripts.

---

## Standard Error Format

All errors MUST use `emit_error()` from `layer1.error_json`:

```python
from layer1.error_json import emit_error
from layer0.exit_codes import EXIT_FILE_NOT_FOUND

emit_error(
    code=EXIT_FILE_NOT_FOUND,
    message="Configuration file not found",
    context={"path": "/path/to/config.json"}
)
```

---

## Exit Code Mapping

| Code | Constant | Use When |
|------|----------|----------|
| 0 | `EXIT_SUCCESS` | Operation completed successfully |
| 1 | `EXIT_ERROR` | General/unspecified error |
| 2 | `EXIT_INVALID_ARGS` | Invalid CLI arguments or missing required args |
| 3 | `EXIT_TIMEOUT` | Operation exceeded time limit |
| 10 | `EXIT_FILE_NOT_FOUND` | Required file does not exist |
| 11 | `EXIT_PERMISSION_DENIED` | Insufficient file/directory permissions |
| 20 | `EXIT_VALIDATION_ERROR` | Input validation failed |
| 30 | `EXIT_DEPENDENCY_ERROR` | Missing dependency or import error |

---

## Anti-Patterns to Detect

### 1. Bare sys.exit()
```python
# BAD
sys.exit(1)

# GOOD
emit_error(EXIT_ERROR, "Operation failed", context={"reason": reason})
```

### 2. Print-based errors
```python
# BAD
print("Error: file not found", file=sys.stderr)
sys.exit(1)

# GOOD
emit_error(EXIT_FILE_NOT_FOUND, "File not found", context={"path": str(path)})
```

### 3. Unstructured exception handling
```python
# BAD
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)

# GOOD
except FileNotFoundError as e:
    emit_error(EXIT_FILE_NOT_FOUND, str(e), context={"path": str(path)})
except PermissionError as e:
    emit_error(EXIT_PERMISSION_DENIED, str(e), context={"path": str(path)})
```

### 4. Wrong exit code category
```python
# BAD: Using general error for file-specific issue
emit_error(EXIT_ERROR, "Config file missing")

# GOOD: Using specific exit code
emit_error(EXIT_FILE_NOT_FOUND, "Config file missing", context={"path": path})
```

---

## Detection Regex Patterns

| Pattern | Detects |
|---------|---------|
| `sys\.exit\(\d+\)` | Bare sys.exit with numeric code |
| `print\(.*[Ee]rror.*file=sys\.stderr\)` | Print-based error output |
| `except\s+Exception` | Overly broad exception handling |
| `exit\(\d+\)` | Built-in exit() usage |

---

## Conversion Checklist

- [ ] All `sys.exit(N)` replaced with `emit_error(EXIT_*, message)`
- [ ] All `print(..., file=sys.stderr)` errors replaced with `emit_error()`
- [ ] All exit codes use named constants from `layer0.exit_codes`
- [ ] Context dict provided with relevant debugging info
- [ ] Specific exception types caught (not bare `except Exception`)
