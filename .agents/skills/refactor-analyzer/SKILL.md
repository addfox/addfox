---
name: refactor-analyzer
description: |
  Interactive refactoring assistant for analyzing code structure and planning refactoring.
  Use when user says "analyze refactor", "refactoring analysis", "improve code structure", "code cleanup".
triggers:
  - refactor
  - refactoring
  - improve code structure
  - code cleanup
  - restructure code
  - clean up code
---

# Refactoring Assistant

Interactive assistant for analyzing and refactoring codebase files.

## Usage

### Analyze Specific File

When a target file is provided, analyze it for refactoring opportunities.

### Find Refactoring Candidates

When no target specified, find files that may need refactoring.

## Refactoring Workflow

### Step 1: Analyze Target

Use `Read` to examine the file and assess:
- File size (line count)
- Number of functions/classes
- Complexity indicators

### Step 2: Identify Function Groups

Group functions by responsibility:

1. **By prefix**: Functions sharing naming prefix
2. **By dependency**: Functions that call each other
3. **By purpose**: Validation, I/O, formatting, etc.

### Step 3: Check Dependencies

Use `Grep` to find:
- What the file imports/sources
- What imports/sources this file

### Step 4: Plan Extraction

For each function group:
- Target module/file name
- Functions to extract
- Required dependencies
- Callers to update

### Step 5: Execute Refactoring

Use the refactor-executor skill for automated extraction:
- Creates new files
- Updates imports
- Preserves functionality

## Refactoring Guidelines

### When to Split

| Indicator | Threshold | Action |
|-----------|-----------|--------|
| Lines | >500 | Consider splitting |
| Functions | >25 | Group by responsibility |
| Dependencies | >10 imports | Consolidate layers |

### Extraction Rules

1. **Minimum 5 functions** per new module
2. **Cohesive responsibility** - related functions together
3. **No circular dependencies** - respect layer architecture
4. **Test coverage** - tests must pass after refactoring

### Naming Conventions

New files:
- `{responsibility}.{ext}` for new modules
- `{original}-{subset}.{ext}` for splits

## Common Refactoring Patterns

### Extract Validation Functions

```
# From: user-service.ts
# To: user-validation.ts
# Functions: validateUser*, checkUser*
```

### Consolidate Related Operations

```
# From: Multiple files with similar operations
# To: unified-operations.ts
# Functions: Related CRUD operations
```

### Standardize Error Handling

```
# Pattern: Convert scattered error handling to consistent approach
# See: error-standardizer skill
```

## Success Criteria

Refactoring complete when:
- File sizes within thresholds
- Functions grouped by responsibility
- No circular dependencies introduced
- All tests pass
- Imports/exports updated correctly

---

## Skill Chaining

@_shared/protocols/skill-chain-contracts.md

### Produces

| Output | Format | Description |
|--------|--------|-------------|
| `extraction-plan` | JSON array | Ordered list of functions to extract with target modules |
| `function-groups` | JSON object | Functions grouped by responsibility |
| `analysis-report` | Markdown | Code structure analysis with metrics and recommendations |

### Consumes

| Input | From Skill | Description |
|-------|------------|-------------|
| `metrics` | `codebase-stats` | File complexity and size metrics |
| `hotspots` | `codebase-stats` | High-change-frequency files |
| `debt-inventory` | `codebase-stats` | Technical debt items for prioritization |

### Chain Relationships

| Direction | Skills | Pattern |
|-----------|--------|---------|
| Chains from | `codebase-stats` | producer-consumer |
| Chains to | `refactor-executor` | analyzer-executor |

The refactor-analyzer produces analysis and plans that the refactor-executor consumes to perform actual code modifications.
