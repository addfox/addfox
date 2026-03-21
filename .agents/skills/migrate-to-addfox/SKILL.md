---
name: migrate-to-addfox
description: Migrate existing browser extension projects from WXT, Plasmo, Extension.js, or no-framework (vanilla) to the Addfox framework. Use when the user wants to migrate an extension to Addfox or asks about converting from WXT/Plasmo/Extension.js/vanilla to addfox.
---

# Migrate to Addfox

## When to use

Use this skill when:
- The user wants to migrate an existing browser extension project to Addfox.
- The user asks how to convert or move from WXT, Plasmo, Extension.js, or a vanilla (no-framework) extension to Exenzo.
- The codebase is identified as one of the supported sources (WXT, Plasmo, Extension.js, or no framework) and migration steps are needed.

## Goal

Migrate WXT, Plasmo, Extension.js, or vanilla (no-framework) browser extension projects to Addfox with minimal behavior change and clear verification.

## Supported source frameworks

- **WXT** — WXT (Web Extension Tools)
- **Plasmo** — Plasmo framework
- **Extension.js** — Extension.js / CRXJS
- **No framework** — Vanilla manifest + scripts

## Migration principles (must follow)

1. **Official first**: Treat Addfox docs and `@addfox/core` behavior as source of truth.
2. **Smallest-change-first**: Complete baseline migration (build runs, manifest valid), then migrate custom behavior.
3. **Do not change business logic**: Avoid touching app runtime code unless the user explicitly asks.
4. **Validate before cleanup**: Keep old config/deps temporarily if needed; remove only after `addfox dev` / `addfox build` succeed.

## Workflow

1. **Detect source framework**
   - Check `package.json` dependencies and config files:
   - WXT: `wxt.config.ts`, `wxt.config.js`, `wxt.config.mjs`, dependency `wxt`
   - Plasmo: `package.json` with `plasmo` dependency, `package.json` "manifest" or plasmo-specific structure
   - Extension.js / CRXJS: Vite-based, `@crxjs/vite-plugin` or similar
   - No framework: plain `manifest.json` + ad-hoc build or no build

2. **Apply framework-specific migration**
   - WXT → [references/wxt.md](references/wxt.md)
   - Plasmo → [references/plasmo.md](references/plasmo.md)
   - Extension.js → [references/extension-js.md](references/extension-js.md)
   - No framework → [references/no-framework.md](references/no-framework.md)
   - Read the referenced file for the detected source before applying changes.

3. **Validate**
   - Run `addfox dev` and confirm extension loads in browser.
   - Run `addfox build` and confirm `.addfox/extension.zip` (or configured output) is produced.
   - Test background, content script, popup/options as applicable.

4. **Cleanup and summarize**
   - Remove obsolete dependencies and config only after validation passes.
   - Summarize changed files and any remaining manual follow-ups.

## Common post-migration checks

- [ ] `addfox.config.ts` (or `.js`/`.mjs`) at project root; `defineConfig` from `addfox`.
- [ ] App code under `app/` (or configured `appDir`); entry discovery or explicit `entry` in config.
- [ ] Manifest: `manifest_version: 3`; entry paths use framework placeholders where needed (e.g. `[addfox.content]` for content scripts).
- [ ] Dependencies: `addfox` (and optionally `webextension-polyfill` for cross-browser); remove WXT/Plasmo/CRXJS-specific packages after migration is verified.

## Additional resources

- Addfox config and entry: use the **addfox-best-practices** skill when configuring or tuning the migrated project.
- Manifest fields and permissions: see addfox-best-practices skill’s reference.md and rules (manifest-fields, permissions).
