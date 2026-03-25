# AI Agent Guide - Preact Addfox Extension

> **Priority**: Follow `.agents/skills/` first, then this guide, then [official docs](https://addfox.dev)

## Project Overview

Preact browser extension using Addfox build tool. Uses `@rsbuild/plugin-preact` for JSX support.

## Key Configuration Fields (addfox.config.ts)

### Required Fields

- **`manifest`** - Extension manifest.json content
  - Supports `chromium` and `firefox` variants
  - Addfox auto-injects entry paths

- **`plugins`** - Rsbuild plugins array
  - Must include `pluginPreact()` for JSX support

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
- `app/popup/` → Popup page (index.tsx + App.tsx)
- `app/options/` → Options page
- `app/sidepanel/` → Side panel

## Framework-Specific Notes

### Preact

- JSX-based (`.tsx` files)
- React-compatible API with smaller bundle size
- TypeScript support enabled

### Browser Extension APIs

- Install `webextension-polyfill` for cross-browser compatibility

### Styling

- Supports CSS Modules
- Content scripts: use `@addfox/utils` with Shadow DOM

## Resources

- Addfox docs: https://addfox.dev
- Rsbuild Preact plugin: https://rsbuild.dev/plugins/list/plugin-preact
- Preact docs: https://preactjs.com
