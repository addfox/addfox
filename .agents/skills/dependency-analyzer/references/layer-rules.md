# Dependency Layer Rules

## Layer Architecture

Strict layered imports prevent circular dependencies. Each layer may only import from layers **below** it.

```
Layer 3  Orchestration    → can import 0, 1, 2
Layer 2  Business Logic   → can import 0, 1
Layer 1  Core Utilities   → can import 0
Layer 0  Primitives       → stdlib only
```

## Layer Definitions

| Layer | Purpose | Modules |
| ----- | ------- | ------- |
| **0 — Primitives** | Foundation types, constants, exit codes | `colors.py`, `constants.py`, `exit_codes.py` |
| **1 — Core Utilities** | File I/O, logging, output, config | `file_ops.py`, `logging.py`, `output_format.py`, `error_json.py`, `config.py` |
| **2 — Business Logic** | Validation, task operations | `validation.py`, `task_ops.py` |
| **3 — Orchestration** | Workflows, migrations, backups | `doctor.py`, `hierarchy_unified.py`, `migrate.py`, `backup.py` |

---

## Import Rules

### Allowed

```python
# Layer 1 → Layer 0 ✅
from layer0.colors import colorize, RED, GREEN

# Layer 2 → Layer 0 + 1 ✅
from layer0.constants import MAX_TASK_DEPTH
from layer1.file_ops import read_file, write_file

# Layer 3 → Layer 0 + 1 + 2 ✅
from layer1.config import load_config
from layer2.validation import validate_path, ValidationResult
```

### Forbidden

```python
# Upward import — Layer 0 → Layer 1 ❌
from layer1.logging import get_logger

# Upward import — Layer 1 → Layer 2 ❌
from layer2.validation import validate_path

# Same-layer circular — both in Layer 1 ❌
# file_ops.py imports logging, logging.py imports file_ops
```

**Rule of thumb:** if `imported_layer >= current_layer`, it's a violation (same-layer peer imports are circular risks).

---

## Violation Detection

```python
import ast, re
from pathlib import Path

def detect_layer_violations(file_path: Path) -> list:
    """Return list of layer-rule violations in a single file."""
    layer_match = re.search(r'/layer(\d+)/', str(file_path))
    if not layer_match:
        return []

    current_layer = int(layer_match.group(1))
    tree = ast.parse(file_path.read_text())
    violations = []

    for node in ast.walk(tree):
        if isinstance(node, ast.ImportFrom) and node.module:
            m = re.match(r'layer(\d+)', node.module)
            if m and int(m.group(1)) >= current_layer:
                violations.append({
                    'file': str(file_path),
                    'line': node.lineno,
                    'current_layer': current_layer,
                    'imported_layer': int(m.group(1)),
                    'import': node.module,
                })
    return violations
```

### CLI usage

```bash
find . -name "*.py" -path "*/layer*" | while read f; do
    python dependency_checker.py "$f"
done
```

### Test assertion

```python
def test_layer_dependencies():
    violations = []
    for layer_dir in Path(__file__).parent.parent.glob("layer*"):
        for py_file in layer_dir.glob("*.py"):
            if py_file.name != "__init__.py":
                violations.extend(detect_layer_violations(py_file))
    assert not violations, f"Layer violations: {violations}"
```

---

## Refactoring Guide

### Moving code between layers

**Moving UP** (e.g., L1 → L2): update the module's imports, update both `__init__.py` files, update all importers, run violation detection.

**Moving DOWN** (e.g., L2 → L1): first strip all higher-layer imports, then follow the same steps plus a full test run — a module cannot move down if it still depends on its old peers.

### Breaking circular dependencies

When two modules in the same layer depend on each other:

1. Extract the shared logic into a lower layer.
2. Use dependency injection (pass deps as function parameters).
3. Promote one module to the next layer up if it's genuinely higher-level.

### Common fixes

| Violation | Fix |
| --------- | --- |
| Layer 0 importing logging | Remove the dependency — L0 cannot log. Use return codes or raise exceptions instead. |
| Same-layer circular (`file_ops` ↔ `config`) | Extract shared logic to Layer 0, or pass one as a parameter to the other. |