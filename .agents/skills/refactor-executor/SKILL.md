---
name: refactor-executor
description: |
  Script splitting and modularization executor for breaking large files into smaller modules.
  Use when user says "split script", "refactor large file", "break up module", "modularize",
  "extract functions", "split into library", "file too big", "reduce file size",
  "separate concerns", "modular refactoring", "decompose script", "extract to lib".
triggers:
  - split script
  - refactor large file
  - break up module
  - modularize
  - extract functions
---

# Refactor Splitter Skill

You are a code refactoring specialist. Your role is to analyze large scripts and split them into smaller, maintainable modules while preserving functionality.

## Before You Begin — Load Reference Docs

Read the following reference file(s) before proceeding with any workflow step:

- Read `references/refactoring-patterns.md` — Reference patterns for safe, automated code refactoring operations.

## Capabilities

1. **Size Analysis** - Identify oversized scripts (>500 lines)
2. **Function Extraction** - Identify cohesive function groups for extraction
3. **Dependency Mapping** - Track which functions depend on which
4. **Module Creation** - Create new library files with extracted functions
5. **Source Update** - Update original scripts to source new libraries

---

## Helper Scripts

The following scripts in `scripts/` provide automated analysis:

| Script | Purpose | CLI Example |
|--------|---------|-------------|
| `file_analyzer.py` | Calculate file metrics and identify split candidates | `python scripts/file_analyzer.py -o json src/` |
| `split_planner.py` | Generate split plan from analysis | `python scripts/split_planner.py analysis.json -o markdown` |

### Usage

```bash
# Analyze a file for refactoring
python scripts/file_analyzer.py --threshold-lines 300 lib/large_module.py -o json > analysis.json

# Generate split plan
python scripts/split_planner.py analysis.json -o markdown

# Analyze entire directory
python scripts/file_analyzer.py --threshold-complexity 20 src/ -o human
```

---

## Critical Thresholds

| Metric | Warning | Critical | Action |
|--------|---------|----------|--------|
| Lines | >500 | >1000 | Consider splitting |
| Functions | >15 | >25 | Group by responsibility |
| Dependencies | >5 sources | >10 sources | Consolidate or layer |

---

## Splitting Methodology

### Phase 1: Analysis

```bash
# Count lines in target file
wc -l "$TARGET_FILE"

# Count functions
grep -c '^[[:space:]]*[a-z_][a-z0-9_]*()' "$TARGET_FILE"

# List all function names
grep -E '^[[:space:]]*[a-z_][a-z0-9_]*\(\)' "$TARGET_FILE" | sed 's/().*//'
```

### Phase 2: Function Grouping

Identify cohesive function groups by:
1. **Naming prefix** - Functions with common prefix (e.g., `backup_*`, `validate_*`)
2. **Responsibility** - Functions serving same purpose
3. **Dependency** - Functions that call each other frequently

### Phase 3: Extraction

For each function group:
1. Create new `lib/{group-name}.sh`
2. Add standard header with source guards
3. Move functions preserving order
4. Add documentation comments

### Phase 4: Integration

1. Add `source` statement to original file
2. Remove extracted functions from original
3. Test that all commands still work
4. Run BATS tests to verify

---

## Output Format

### Analysis Report

```markdown
# Refactoring Analysis: {{TARGET_FILE}}

## Summary

- **Total Lines**: {N}
- **Total Functions**: {N}
- **Recommended Splits**: {N}

## Function Groups

### Group 1: {{GROUP_NAME}}
- Functions: {list}
- Lines: {N}
- Target: `lib/{{GROUP_NAME}}.sh`

### Group 2: {{GROUP_NAME}}
- Functions: {list}
- Lines: {N}
- Target: `lib/{{GROUP_NAME}}.sh`

## Extraction Plan

1. Create `lib/{{GROUP_1}}.sh` with {N} functions
2. Create `lib/{{GROUP_2}}.sh` with {N} functions
3. Update `{{TARGET_FILE}}` to source new libraries
4. Run tests to verify functionality

## Risk Assessment

- **Breaking Changes**: {list or "None expected"}
- **Test Coverage**: {percentage}
- **Rollback Plan**: Git revert if tests fail
```

---

## Library File Template

```bash
#!/usr/bin/env bash
# {{LIBRARY_NAME}} - {{DESCRIPTION}}
# Extracted from: {{SOURCE_FILE}}
# Date: {{DATE}}

# Source guard
[[ -n "${_{{LIBRARY_UPPER}}_LOADED:-}" ]] && return 0
readonly _{{LIBRARY_UPPER}}_LOADED=1

# Dependencies
source "${LIB_DIR:-lib}/{{DEPENDENCY}}.sh"

#######################################
# {{FUNCTION_NAME}}
# {{DESCRIPTION}}
# Arguments:
#   $1 - {{ARG1_DESC}}
# Returns:
#   0 on success, non-zero on failure
#######################################
{{FUNCTION_NAME}}() {
    {{FUNCTION_BODY}}
}
```

---

## Task System Integration

@_shared/templates/skill-boilerplate.md#task-integration

### Skill-Specific Sequence

1. Analyze target file(s)
2. Generate extraction plan
3. Execute extraction (with user approval)
4. Run tests to verify

---

## Subagent Protocol

@_shared/templates/skill-boilerplate.md#subagent-protocol

**Summary Message**: "Refactoring complete. See MANIFEST.jsonl for summary."

---

## Manifest Entry

@_shared/templates/skill-boilerplate.md#manifest-entry

---

## Context Variables

| Token | Description | Example |
|-------|-------------|---------|
| `{{TARGET_FILE}}` | File to refactor | `lib/validation.sh` |
| `{{FUNCTION_GROUPS}}` | Identified groups | JSON array |
| `{{EXTRACTION_PLAN}}` | Ordered extraction steps | Markdown list |
| `{{SLUG}}` | URL-safe topic name | `validation-split` |

---

## Anti-Patterns

| Pattern | Problem | Solution |
|---------|---------|----------|
| Splitting too small | Creates maintenance burden | Minimum 5 functions per module |
| Breaking dependencies | Runtime errors | Map dependencies before splitting |
| No tests | Silent breakage | Require test pass before/after |
| Over-extraction | Too many tiny files | Group related functions together |

---

## Error Handling

@_shared/templates/skill-boilerplate.md#error-handling

---

## Completion Checklist

@_shared/templates/skill-boilerplate.md#completion-checklist

### Skill-Specific Checks

- [ ] Target file analyzed (lines, functions, dependencies)
- [ ] Function groups identified
- [ ] Extraction plan created
- [ ] User approval obtained
- [ ] New library files created
- [ ] Source statements updated
- [ ] Tests pass after extraction

---

## Skill Chaining

@_shared/protocols/skill-chain-contracts.md

### Produces

| Output | Format | Description |
|--------|--------|-------------|
| `library-files` | Source files | Newly created library modules with extracted functions |
| `refactoring-report` | Markdown | Summary of changes made, files affected |

### Consumes

| Input | From Skill | Description |
|-------|------------|-------------|
| `extraction-plan` | `refactor-analyzer` | Ordered list of functions to extract |
| `function-groups` | `refactor-analyzer` | Functions grouped by responsibility |
| `analysis-report` | `refactor-analyzer` | Code structure analysis for context |

### Chain Relationships

| Direction | Skills | Pattern |
|-----------|--------|---------|
| Chains from | `refactor-analyzer` | analyzer-executor |
| Chains to | `validator` | quality-gate |

The refactor-executor consumes analysis from refactor-analyzer and produces modified code for validator to verify.
