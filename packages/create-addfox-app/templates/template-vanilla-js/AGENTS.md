# AI Agent Guide - Vanilla Addfox Extension

> **Priority**: Follow `.agents/skills/` first, then this guide, then [official docs](https://addfox.dev)

## Project Overview

Vanilla JavaScript browser extension using Addfox build tool. No framework plugins needed.

## Key Configuration Fields (addfox.config.js)

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
- **`plugins`** - Add Rsbuild plugins if needed

## Entry Structure

Entries auto-discovered from `appDir` subdirectories. Each needs `index.js` as entry.

## Notes

### JavaScript

- Pure JavaScript without framework
- DOM APIs available directly

### Browser Extension APIs

- Install `webextension-polyfill` for cross-browser compatibility
- Or use `chrome.*` APIs directly

### Styling

- Plain CSS
- Content scripts: use `@addfox/utils` with Shadow DOM

## Resources

- Addfox docs: https://addfox.dev
- WebExtension API: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API
