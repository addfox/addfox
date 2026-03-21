---
name: addfox-meta
description: meta.md provides structured metadata for the project, including permissions, entry mappings, and build artifacts, serving as a key reference for AI refactoring and design.
---

# meta.md

`meta.md` is the detailed structured context for AI assistants, located in the `.addfox/` directory at the project root.

## 1. Core Structure

The generated `meta.md` contains the following standard sections:

### Basic Information

Includes framework name, project name, description, version, and the current Manifest version number.

### Permissions

Lists permissions requested by the extension in three categories:
- **Permissions**: Core feature permissions.
- **Host Permissions**: Permissions for specific hosts.
- **Optional Permissions**: Permissions that can be requested at runtime.

### Entry Mappings

The most critical section, listing detailed information for all extension entries:
- **Source**: Absolute path to the source code file.
- **HTML**: Path to the associated HTML template (if it exists).
- **JS Output**: Path to the generated script in the build output.
- **Flags**: Configuration flags for the entry (e.g., `html: true`, `scriptInject: body`).

---

> **Note**: Before making complex architectural adjustments or modifying `addfox.config.ts`, always guide the AI to read this file to ensure compatibility with the current project structure.
