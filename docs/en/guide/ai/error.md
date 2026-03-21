---
name: addfox-error
description: error.md records the original error stacks and context information during extension runtime, serving as the single source of truth for AI to handle runtime issues.
---

# error.md

When Addfox monitors a runtime error in a browser extension, it generates an `error.md` file in the `.addfox/` directory at the project root.

## 1. Core Structure

The generated `error.md` contains the following standard sections:

### Error Summary

Provides basic metadata, including:
- **Entry**: The entry point where the error occurred (e.g., `content`, `background`, `popup`).
- **Type**: Type of error (e.g., `error`, `warning`).
- **Time**: Local time when the error occurred.
- **Message**: Original error message content.
- **Location**: Source code location or path of the compiled resource.

### Build Context

Provides basic info about the build tech stack, such as:
- **Bundler**: Build tool name (usually `rsbuild`).
- **Framework**: Current UI framework used.

### Stack Trace

Provides the full JavaScript error call stack. AI uses this section to quickly trace back to the specific line of code that caused the crash.

---

> **Note**: This file only keeps information about the most recent error. When the dev server restarts or a new error occurs, the old content will be cleared.
