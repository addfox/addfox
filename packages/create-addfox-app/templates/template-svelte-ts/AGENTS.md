# AI Agent Guide - Svelte Addfox Extension

> **Priority**: Follow `.agents/skills/` first, then this guide, then [official docs](https://addfox.dev)

## Project Overview

Svelte browser extension using Addfox build tool. Uses `@rsbuild/plugin-svelte` for Svelte support.

## Key Configuration Fields (addfox.config.ts)

### Required Fields

- **`manifest`** - Extension manifest.json content
  - Supports `chromium` and `firefox` variants
  - Addfox auto-injects entry paths

- **`plugins`** - Rsbuild plugins array
  - Must include `pluginSvelte()` for Svelte support

### Optional Fields (use when needed)

- **`appDir`** - Source directory (default: "app")
- **`outDir`** - Build output directory
- **`entry`** - Manual entry mapping
- **`hotReload`** - Dev server settings
- **`debug`** - Enable debug logging
- **`zip`** - Output zip configuration
- **`rsbuild`** - Override Rsbuild configuration

## Entry Structure

Entries auto-discovered from `appDir` subdirectories:

- `app/background/` → Service Worker (index.ts)
- `app/content/` → Content Script (index.ts)
- `app/popup/` → Popup page (index.ts + App.svelte)
- `app/options/` → Options page
- `app/sidepanel/` → Side panel

## Framework-Specific Notes

### Svelte

- Single File Components (`.svelte` files)
- TypeScript support in `<script lang="ts">`
- Reactive statements with `$:`

### Browser Extension APIs

- Install `webextension-polyfill` for cross-browser compatibility

### Styling

- Svelte scoped styles by default
- Content scripts: use `@addfox/utils` with Shadow DOM

## Resources

- Addfox docs: https://addfox.dev
- Rsbuild Svelte plugin: https://rsbuild.dev/plugins/list/plugin-svelte
- Svelte docs: https://svelte.dev
