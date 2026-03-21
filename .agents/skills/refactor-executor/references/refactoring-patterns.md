# Refactoring Patterns

Reference patterns for safe, automated code refactoring operations.

---

## Extract Function

Move a block of code into a named function.

### When to Use
- Code block appears more than once
- Block is longer than 15 lines
- Block has a clear single responsibility

### Steps
1. Identify the code block to extract
2. Determine input parameters (variables read)
3. Determine return values (variables modified)
4. Create function with descriptive name
5. Replace original code with function call
6. Run tests to verify behavior

### Example
```python
# Before
data = file.read()
lines = data.split('\n')
result = [l.strip() for l in lines if l.strip()]

# After
def parse_non_empty_lines(content: str) -> list[str]:
    lines = content.split('\n')
    return [l.strip() for l in lines if l.strip()]

result = parse_non_empty_lines(file.read())
```

---

## Split Module

Break a large file into smaller, focused modules.

### When to Use
- File exceeds 300 lines
- File contains 3+ unrelated function groups
- Circular import risk from growing module

### Steps
1. Identify logical groups of functions/classes
2. Create new module for each group
3. Move functions preserving import order
4. Update `__init__.py` with re-exports
5. Update all import sites
6. Run tests to verify

### Naming Convention
- Original: `utils.py`
- Split: `file_utils.py`, `string_utils.py`, `date_utils.py`

---

## Rename Symbol

Rename a function, class, variable, or module.

### Steps
1. Find all usages (imports, calls, references)
2. Rename definition
3. Update all import statements
4. Update all call sites
5. Update docstrings and comments
6. Run tests to verify

### Safety Checks
- Search for string-based references (e.g., `getattr(obj, "old_name")`)
- Check configuration files for name references
- Check test fixtures and mocks

---

## Move to Different Layer

Relocate a module between architecture layers.

### Prerequisites
- New layer must not violate dependency rules
- All imports from the module must be updated
- Module's own imports must be valid at new layer

### Steps
1. Verify target layer dependencies are satisfied
2. Move file to target layer directory
3. Update module's own imports
4. Update source layer `__init__.py` (remove exports)
5. Update target layer `__init__.py` (add exports)
6. Update all import sites across codebase
7. Run dependency checker to verify no violations

---

## Safety Checklist

- [ ] All existing tests pass before refactoring
- [ ] Changes are atomic (one refactoring per commit)
- [ ] No behavior changes introduced
- [ ] All import sites updated
- [ ] `__init__.py` exports updated
- [ ] New tests added for extracted functions
- [ ] Syntax verified: `python3 -m py_compile`
- [ ] All tests pass after refactoring
