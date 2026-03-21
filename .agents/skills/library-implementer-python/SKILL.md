---
name: library-implementer-python
description: |
  Python library implementation skill for creating modules in lib/.
  Use when user says "create library", "implement module", "add to lib/",
  "python library", "helper functions", "utility module", "layer module",
  "python module", "shared utilities", "create helper".
triggers:
  - create library
  - implement module
  - add to lib/
  - python library
  - helper functions
  - utility module
---

# Library Implementer (Python) Skill

You are a Python library implementer. Your role is to create well-structured Python library modules with reusable functions following the project's layer architecture.

## Post-Implementation Validation — Layer Checker

After implementing any library module, run the layer dependency checker to verify architecture compliance:

```bash
python scripts/layer_checker.py <library_dir>
```

**Example:**
```bash
python scripts/layer_checker.py skills/_shared/python
```

**Passing output:** `All layer dependencies valid. No violations found.`

**If violations are found:** The script reports which files import from disallowed layers. Fix all violations before marking the task complete — Layer N can only import from Layer < N.

## Capabilities

1. **Layer Modules** - Create lib/layer{N}/*.py files following dependency rules
2. **Type-Safe Code** - PEP 484 type hints throughout
3. **Atomic Operations** - Safe file persistence patterns
4. **Documentation** - Docstrings with Args/Returns/Raises sections

---

## Layer Architecture

### Directory Structure

```
lib/
├── __init__.py
├── layer0/                      # Zero dependencies (foundation)
│   ├── __init__.py
│   ├── exit_codes.py           # Exit code constants
│   ├── colors.py               # Color output utilities
│   └── constants.py            # Application constants
├── layer1/                      # Depends on Layer 0 only
│   ├── __init__.py
│   ├── logging.py              # Audit trail logging
│   ├── error_json.py           # Standardized error JSON output
│   ├── config.py               # Configuration management
│   ├── file_ops.py             # Atomic file operations
│   └── output_format.py        # JSON/human output formatting
├── layer2/                      # Depends on Layer 0-1
│   ├── __init__.py
│   ├── validation.py           # Input validation functions
│   └── task_ops.py             # Task operations
└── layer3/                      # Depends on Layer 0-2
    ├── __init__.py
    ├── migrate.py              # Schema migration
    ├── backup.py               # Backup operations
    ├── doctor.py               # Diagnostic utilities
    └── hierarchy_unified.py    # Unified task hierarchy
```

### Layer Dependency Rules

| Layer | Can Import | Cannot Import |
|-------|------------|---------------|
| Layer 0 | None (foundation) | 1, 2, 3 |
| Layer 1 | Layer 0 | 2, 3 |
| Layer 2 | Layer 0, 1 | 3 |
| Layer 3 | Layer 0, 1, 2 | - |

**CRITICAL**: Never create circular dependencies. Always verify imports follow layer rules.

---

## Module Template

```python
"""
lib/layer{N}/{module_name}.py - Brief description of module purpose.

This module provides:
- function_one: Brief description
- function_two: Brief description
- ClassName: Brief description

Example:
    from lib.layer{N}.{module_name} import function_one
    result = function_one(arg1, arg2)
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any, Optional

# Layer imports (verify layer rules!)
from lib.layer0.exit_codes import EXIT_SUCCESS, EXIT_ERROR
from lib.layer0.constants import DEFAULT_ENCODING

# ==============================================================================
# CONSTANTS
# ==============================================================================

MODULE_CONSTANT: str = "value"
"""Brief description of the constant."""

# ==============================================================================
# EXCEPTIONS
# ==============================================================================


class ModuleError(Exception):
    """Base exception for this module."""
    pass


class SpecificError(ModuleError):
    """Raised when specific condition occurs."""
    pass


# ==============================================================================
# DATA CLASSES
# ==============================================================================


@dataclass
class ResultData:
    """Container for operation results.

    Attributes:
        success: Whether the operation succeeded.
        message: Human-readable result message.
        data: Optional payload data.
    """

    success: bool
    message: str
    data: Optional[dict[str, Any]] = None


# ==============================================================================
# FUNCTIONS
# ==============================================================================


def function_name(
    required_arg: str,
    optional_arg: Optional[int] = None,
    *,
    keyword_only: bool = False,
) -> ResultData:
    """Brief description of what this function does.

    Longer description if needed. Explain the purpose, behavior,
    and any important considerations.

    Args:
        required_arg: Description of this argument.
        optional_arg: Description with default behavior. Defaults to None.
        keyword_only: Description of keyword-only arg. Defaults to False.

    Returns:
        ResultData containing the operation outcome.

    Raises:
        SpecificError: When specific condition occurs.
        ValueError: When input validation fails.

    Example:
        >>> result = function_name("input", optional_arg=42)
        >>> print(result.message)
        'Operation completed'
    """
    # Input validation
    if not required_arg:
        raise ValueError("required_arg cannot be empty")

    # Implementation
    return ResultData(
        success=True,
        message="Operation completed",
        data={"input": required_arg},
    )


def _private_helper(value: str) -> str:
    """Internal helper function (private, not exported).

    Args:
        value: Input value to process.

    Returns:
        Processed value.
    """
    return value.strip().lower()


# ==============================================================================
# CLASSES
# ==============================================================================


class ClassName:
    """Brief description of the class purpose.

    Longer description if needed. Explain when to use this class
    and its main responsibilities.

    Attributes:
        attribute_one: Description of attribute.
        attribute_two: Description of attribute.

    Example:
        >>> obj = ClassName("value")
        >>> obj.do_something()
    """

    def __init__(self, value: str) -> None:
        """Initialize ClassName.

        Args:
            value: Initial value for the instance.
        """
        self.attribute_one: str = value
        self.attribute_two: int = 0

    def do_something(self) -> bool:
        """Perform the main operation.

        Returns:
            True if operation succeeded, False otherwise.
        """
        return True
```

---

## Import Patterns

### Correct Layer Imports

```python
# Layer 1 module importing from Layer 0
from lib.layer0.exit_codes import EXIT_SUCCESS, EXIT_ERROR
from lib.layer0.colors import colorize

# Layer 2 module importing from Layer 0 and 1
from lib.layer0.constants import DEFAULT_ENCODING
from lib.layer1.logging import log_action
from lib.layer1.file_ops import atomic_write

# Layer 3 module importing from Layer 0, 1, and 2
from lib.layer0.exit_codes import EXIT_SUCCESS
from lib.layer1.config import load_config
from lib.layer2.validation import validate_task_id
```

### NEVER Do This

```python
# WRONG: Layer 1 importing from Layer 2
from lib.layer2.validation import validate  # Violates layer rules!

# WRONG: Circular import
# In lib/layer1/a.py:
from lib.layer1.b import function_b
# In lib/layer1/b.py:
from lib.layer1.a import function_a  # Circular!
```

---

## Atomic File Operations Pattern

```python
from pathlib import Path
from tempfile import NamedTemporaryFile
import shutil

def atomic_write(path: Path, content: str, encoding: str = "utf-8") -> None:
    """Write file atomically using temp file + rename pattern.

    Args:
        path: Target file path.
        content: Content to write.
        encoding: File encoding. Defaults to "utf-8".

    Raises:
        OSError: If write operation fails.
    """
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)

    # Write to temp file in same directory (for atomic rename)
    with NamedTemporaryFile(
        mode="w",
        dir=path.parent,
        delete=False,
        encoding=encoding,
        suffix=".tmp",
    ) as tmp:
        tmp.write(content)
        tmp_path = Path(tmp.name)

    # Atomic rename
    shutil.move(str(tmp_path), str(path))
```

---

## Error Handling Pattern

```python
from lib.layer1.error_json import emit_error

def safe_operation(file_path: Path) -> ResultData:
    """Perform operation with proper error handling.

    Args:
        file_path: Path to process.

    Returns:
        ResultData with operation outcome.
    """
    # Check preconditions
    if not file_path.exists():
        return ResultData(
            success=False,
            message=f"File not found: {file_path}",
        )

    try:
        content = file_path.read_text()
        # Process content...
        return ResultData(success=True, message="Success")

    except PermissionError as e:
        return ResultData(
            success=False,
            message=f"Permission denied: {file_path}",
            data={"error": str(e)},
        )

    except Exception as e:
        # Log unexpected errors
        return ResultData(
            success=False,
            message=f"Unexpected error: {e}",
            data={"error_type": type(e).__name__},
        )
```

---

## Syntax Verification

After creating a module, ALWAYS verify syntax:

```bash
python -m py_compile lib/layer{N}/{module_name}.py
```

---

## Task System Integration

@_shared/templates/skill-boilerplate.md#task-integration

### Execution Sequence

1. Get task details via `TaskGet`
2. Set focus via `TaskUpdate` (status: in_progress) - skip if orchestrator already set
3. Determine correct layer for module (based on dependencies)
4. Create module file following layer architecture
5. Verify syntax: `python -m py_compile lib/layer{N}/{module}.py`
6. Append manifest entry to `{{MANIFEST_PATH}}`
7. Complete task via `TaskUpdate` (status: completed)
8. Return summary message only

---

## Subagent Protocol

@_shared/templates/skill-boilerplate.md#subagent-protocol

### Output Requirements

1. MUST create module file in correct lib/layer{N}/ directory
2. MUST follow layer dependency rules
3. MUST include type hints on all functions
4. MUST verify syntax: `python -m py_compile`
5. MUST append ONE line to: `{{MANIFEST_PATH}}`
6. MUST return ONLY: "Implementation complete. See MANIFEST.jsonl for summary."
7. MUST NOT return full module content in response

### Manifest Entry Format

@_shared/templates/skill-boilerplate.md#manifest-entry

Library-specific fields:

```json
{"id":"lib-{{MODULE}}-{{DATE}}","file":"{{DATE}}_lib-{{MODULE}}.md","title":"Library: {{MODULE}}","date":"{{DATE}}","status":"complete","topics":["library","python","layer{{N}}","{{DOMAIN}}"],"key_findings":["Created lib/layer{{N}}/{{MODULE}}.py with N functions","Functions: function1, function2, function3","Layer: {{N}} (imports from layers 0-{{N-1}})","Type hints: complete","Syntax check passed"],"actionable":false,"needs_followup":["{{TEST_TASK_IDS}}"],"linked_tasks":["{{TASK_ID}}"]}
```

---

## Completion Checklist

@_shared/templates/skill-boilerplate.md#completion-checklist

Library-specific items:

- [ ] Module created in correct layer directory
- [ ] Layer dependency rules followed (no upward imports)
- [ ] Type hints on all public functions and methods
- [ ] Docstrings with Args/Returns/Raises sections
- [ ] Custom exceptions defined (if needed)
- [ ] Dataclasses used for structured data
- [ ] Syntax check passed (`python -m py_compile`)

---

## Anti-Patterns

@_shared/templates/anti-patterns.md#implementation-anti-patterns

### Python-Specific Anti-Patterns

**DO NOT**:
- Use `Any` type when a specific type is known
- Create modules without `__init__.py`
- Import `*` from modules
- Use mutable default arguments (`def f(x=[])`)
- Ignore layer dependency rules
- Skip type hints on public APIs
- Use bare `except:` clauses
