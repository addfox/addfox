# AI Agent Guide - Vanilla Addfox Extension

> **Priority**: Follow `.agents/skills/` first, then this guide, then [official docs](https://addfox.dev)

## Project Overview

Vanilla TypeScript browser extension using Addfox build tool. No framework plugins needed.

## Key Configuration Fields (addfox.config.ts)

### Required Fields

- **`manifest`** - Extension manifest.json content
  - Supports `chromium` and `firefox` variants
  - Addfox auto-injects entry paths

### Optional Fields (use when needed)

- **`appDir`** - Source directory (default: "app")
- **`outDir`** - Build output directory
- **`entry`** - Manual entry mapping
- **`hotReload`** - Dev server settings
- **`debug`** - Enable debug logging
- **`zip`** - Output zip configuration
- **`rsbuild`** - Override Rsbuild configuration
- **`plugins`** - Add Rsbuild plugins if needed (no framework plugin required)

## Entry Structure

Entries auto-discovered from `appDir` subdirectories:

- `app/background/` → Service Worker (index.ts)
- `app/content/` → Content Script (index.ts)
- `app/popup/` → Popup page (index.ts + HTML)
- `app/options/` → Options page
- `app/sidepanel/` → Side panel

## Notes

### TypeScript

- Pure TypeScript without framework
- DOM APIs available directly
- No JSX transform needed

### Browser Extension APIs

- Install `webextension-polyfill` for cross-browser compatibility
- Or use `chrome.*` APIs directly

### Styling

- Plain CSS or CSS Modules
- Content scripts: use `@addfox/utils` with Shadow DOM

## Resources

- Addfox docs: https://addfox.dev
- WebExtension API: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API
