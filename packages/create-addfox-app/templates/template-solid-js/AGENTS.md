# AI Agent Guide - Solid Addfox Extension

> **Priority**: Follow `.agents/skills/` first, then this guide, then [official docs](https://addfox.dev)

## Project Overview

SolidJS browser extension using Addfox build tool. Uses `@rsbuild/plugin-solid` for Solid support.

## Key Configuration Fields (addfox.config.js)

### Required Fields

- **`manifest`** - Extension manifest.json content
  - Supports `chromium` and `firefox` variants
  - Addfox auto-injects entry paths

- **`plugins`** - Rsbuild plugins array
  - Must include `pluginSolid()` for Solid JSX support

### Optional Fields (use when needed)

- **`appDir`** - Source directory (default: "app")
- **`outDir`** - Build output directory
- **`entry`** - Manual entry mapping
- **`hotReload`** - Dev server settings
- **`debug`** - Enable debug logging
- **`zip`** - Output zip configuration
- **`rsbuild`** - Override Rsbuild configuration

## Entry Structure

Entries auto-discovered from `appDir` subdirectories. Each needs `index.jsx` as entry.

## Framework-Specific Notes

### SolidJS

- JSX-based (`.jsx` files)
- Fine-grained reactivity with signals

### Browser Extension APIs

- Install `webextension-polyfill` for cross-browser compatibility

### Styling

- Supports CSS Modules
- Content scripts: use `@addfox/utils` with Shadow DOM

## Resources

- Addfox docs: https://addfox.dev
- Rsbuild Solid plugin: https://rsbuild.dev/plugins/list/plugin-solid
- Solid docs: https://www.solidjs.com
