# AI usage (@addfox/core)

## Purpose

Provides addfox types, config loading, entry discovery/resolution, manifest building, CLI parsing and error utilities. Used by `@addfox/cli` and Rsbuild plugins.

## When to use

- Import from `@addfox/core` when you need **types** (`AddfoxUserConfig`, `EntryInfo`, `ManifestConfig`, `PipelineContext`, etc.)
- Use `resolveAddfoxConfig`, `discoverEntries`, `resolveManifestChromium`, etc. in **non-CLI scripts** when loading config, discovering entries or generating manifest
- Use `mergeRsbuildConfig(base, user)` to **merge Rsbuild config**
- Use `AddfoxError`, `createConfigNotFoundError`, etc. to **throw or detect addfox errors**

## Entries and constants

- Config: `CONFIG_FILES`, `DEFAULT_APP_DIR`, `DEFAULT_OUT_DIR`
- Entries: `SCRIPT_EXTS`, `HTML_ENTRY_NAMES`, `SCRIPT_ONLY_ENTRY_NAMES`, `RESERVED_ENTRY_NAMES`, `MANIFEST_ENTRY_PATHS`
- Do not hardcode entry names or output paths; use these constants.

## When changing this package

- When adding or changing reserved entry names or manifest output paths, update `constants.ts` and `ManifestBuilder`, then run `pnpm test` (core has unit tests).
