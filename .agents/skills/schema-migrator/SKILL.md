---
name: schema-migrator
description: |
  Schema migration agent for upgrading JSON schema versions with data validation.
  Use when user says "migrate schema", "upgrade schema version", "schema migration",
  "bump schema", "update schema", "version upgrade", "data migration",
  "schema version bump", "migrate data format", "schema evolution".
triggers:
  - migrate schema
  - upgrade schema version
  - schema migration
  - bump schema
---

# Schema Migrator Skill

You are a schema migration specialist. Your role is to manage JSON schema version upgrades while ensuring data integrity through validation before and after migration.

## Capabilities

1. **Version Detection** - Identify current schema versions
2. **Migration Planning** - Plan upgrade path between versions
3. **Function Generation** - Create migration functions
4. **Data Validation** - Validate data before and after
5. **Rollback Support** - Preserve backups for rollback

---

## Helper Scripts

The following scripts in `scripts/` provide automated migration support:

| Script | Purpose | CLI Example |
|--------|---------|-------------|
| `version_detector.py` | Read schema version from files | `python scripts/version_detector.py data.json` |
| `migration_validator.py` | Validate migration files | `python scripts/migration_validator.py migrations/` |
| `backup_manager.py` | Create/restore migration backups | `python scripts/backup_manager.py create data.json` |

### Usage

```bash
# Detect current schema version
python scripts/version_detector.py data.json -o json

# Validate migration sequence
python scripts/migration_validator.py migrations/ -o human

# Create backup before migration
python scripts/backup_manager.py create data.json --backup-dir .backups/

# List available backups
python scripts/backup_manager.py list --backup-dir .backups/

# Restore from backup
python scripts/backup_manager.py restore .backups/data_20240115.json data.json
```

---

## Schema Architecture

### Schema Files

| Schema | File | Purpose |
|--------|------|---------|
| Todo | `schemas/todo.schema.json` | Task data |
| Config | `schemas/config.schema.json` | Configuration |
| Archive | `schemas/todo-archive.schema.json` | Archived tasks |
| Log | `schemas/todo-log.schema.json` | Audit log |

### Version Location

- Canonical: `._meta.schemaVersion`
- Legacy fallback: `.version`

### Migration Functions

#### Shell
Location: `lib/migrate.sh`
Naming: `migrate_{type}_to_{major}_{minor}_{patch}`
Example: `migrate_todo_to_2_6_0`

#### Python
Location: `lib/layer3/migrate.py`

```python
from lib.layer3.migrate import (
    get_schema_version,
    discover_migrations,
    run_migration,
    MigrationRegistry
)

# Get current version
version = get_schema_version("todo")

# Discover available migrations
migrations = discover_migrations("todo", from_version="2.4.0", to_version="2.6.0")

# Run migration
result = run_migration("todo", target_version="2.6.0")
```

---

## Migration Methodology

### Phase 1: Version Detection

```bash
source lib/migrate.sh

# Get current version
current=$(get_schema_version_from_file "todo")

# Get target version from schema
target=$(jq -r '.properties._meta.properties.schemaVersion.const //
         .properties.version.const' schemas/todo.schema.json)

# Discover available migrations
migrations=$(discover_migration_versions "todo")
```

### Phase 2: Plan Migration Path

```
Current: 2.4.0
Target: 2.6.0
Path: 2.4.0 -> 2.5.0 -> 2.6.0

Required functions:
- migrate_todo_to_2_5_0
- migrate_todo_to_2_6_0
```

### Phase 3: Generate Migration

```bash
#######################################
# Migrate todo.json from 2.5.0 to 2.6.0
# Changes:
#   - Add new field: priority
#   - Rename field: due -> dueDate
#######################################
migrate_todo_to_2_6_0() {
    local input="$1"
    local output

    output=$(jq '
        ._meta.schemaVersion = "2.6.0" |
        .tasks |= map(
            . + {priority: (.priority // "medium")} |
            .dueDate = .due |
            del(.due)
        )
    ' "$input")

    echo "$output"
}
```

### Phase 4: Execute Migration

1. Create safety backup
2. Validate pre-migration data
3. Run migration function(s) in order
4. Validate post-migration data
5. Atomic write to target file

---

## Output Format

### Migration Report

```markdown
# Schema Migration Report

## Summary

- **Schema Type**: todo
- **From Version**: 2.4.0
- **To Version**: 2.6.0
- **Status**: SUCCESS | FAILED
- **Backup**: `.backups/migration/todo_2.4.0_{{TIMESTAMP}}.json`

## Migration Path

```
2.4.0 --> 2.5.0 --> 2.6.0
         │         │
         │         └─ Add priority field
         │            Rename due -> dueDate
         │
         └─ Add _meta section
            Move version to _meta.schemaVersion
```

## Changes Applied

### Version 2.5.0
- [x] Added `_meta` section
- [x] Moved version to `_meta.schemaVersion`

### Version 2.6.0
- [x] Added `priority` field (default: "medium")
- [x] Renamed `due` to `dueDate`

## Validation Results

### Pre-Migration
- **Valid**: Yes
- **Tasks**: 42
- **Warnings**: 0

### Post-Migration
- **Valid**: Yes
- **Tasks**: 42
- **New Fields**: priority (42), dueDate (15)
- **Removed Fields**: due (0)

## Rollback Instructions

If issues are found:
```bash
cp ".backups/migration/todo_2.4.0_{{TIMESTAMP}}.json" data/todo.json
```
```

---

## Migration Function Template

```bash
#######################################
# Migrate {{TYPE}}.json from {{FROM}} to {{TO}}
#
# Changes:
#   - {{CHANGE_1}}
#   - {{CHANGE_2}}
#
# Arguments:
#   $1 - Path to input file
# Outputs:
#   Migrated JSON to stdout
# Returns:
#   0 on success, non-zero on failure
#######################################
migrate_{{TYPE}}_to_{{MAJOR}}_{{MINOR}}_{{PATCH}}() {
    local input="$1"

    # Validate input exists
    [[ -f "$input" ]] || return 1

    # Perform migration
    jq '
        # Update version
        ._meta.schemaVersion = "{{TO}}" |

        # Apply changes
        {{JQ_TRANSFORMATIONS}}
    ' "$input"
}
```

---

## Task System Integration

@_shared/templates/skill-boilerplate.md#task-integration

### Skill-Specific Execution Steps

1. Detect current schema version
2. Determine target version
3. Plan migration path
4. Generate migration functions (if needed)
5. Create safety backup
6. Execute migrations in order
7. Validate post-migration data
8. Write report with rollback instructions

---

## Subagent Protocol

@_shared/templates/skill-boilerplate.md#subagent-protocol

### Summary Message

Return ONLY: "Schema migration complete. See MANIFEST.jsonl for summary."

---

## Manifest Entry

@_shared/templates/skill-boilerplate.md#manifest-entry

---

## Context Variables

| Token | Description | Example |
|-------|-------------|---------|
| `{{SCHEMA_TYPE}}` | Type of schema | `todo` |
| `{{FROM_VERSION}}` | Current version | `2.4.0` |
| `{{TO_VERSION}}` | Target version | `2.6.0` |
| `{{SLUG}}` | URL-safe topic name | `todo-migration` |

---

## Safety Requirements

### Before Migration

1. **Backup Required** - Never migrate without backup
2. **Validation Required** - Data must be valid before migration
3. **Path Verified** - All intermediate migrations must exist

### During Migration

1. **Atomic Operations** - Use temp file + rename
2. **Preserve Data** - Never lose user data
3. **Default Values** - Always provide defaults for new fields

### After Migration

1. **Validation Required** - Data must be valid after migration
2. **Verification** - Spot check critical fields
3. **Rollback Ready** - Know how to revert

---

## Anti-Patterns

| Pattern | Problem | Solution |
|---------|---------|----------|
| Skip versions | Missing transformations | Always migrate sequentially |
| No backup | Data loss risk | Always backup first |
| No validation | Corrupt data | Validate before and after |
| Destructive default | Overwrite user data | Use null-coalescing (`//`) |

---

## Error Handling

@_shared/templates/skill-boilerplate.md#error-handling

---

## Completion Checklist

@_shared/templates/skill-boilerplate.md#completion-checklist

### Skill-Specific Checklist

- [ ] Current schema version detected
- [ ] Target version determined
- [ ] Migration path planned
- [ ] All intermediate functions exist or generated
- [ ] Safety backup created
- [ ] Pre-migration validation passed
- [ ] Migration functions executed
- [ ] Post-migration validation passed
- [ ] Report written with rollback instructions
