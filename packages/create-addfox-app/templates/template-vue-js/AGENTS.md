# AI Agent Guide - Vue Addfox Extension

> **Priority**: Follow `.agents/skills/` first, then this guide, then [official docs](https://addfox.dev)

## Project Overview

Vue 3 browser extension using Addfox build tool. Uses `@rsbuild/plugin-vue` for SFC support.

## Key Configuration Fields (addfox.config.js)

### Required Fields

- **`manifest`** - Extension manifest.json content
  - Supports `chromium` and `firefox` variants
  - Addfox auto-injects entry paths

- **`plugins`** - Rsbuild plugins array
  - Must include `pluginVue()` for Vue SFC support

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

- `app/background/` → Service Worker (index.js)
- `app/content/` → Content Script (index.js)
- `app/popup/` → Popup page (index.js + App.vue)
- `app/options/` → Options page
- `app/sidepanel/` → Side panel

## Framework-Specific Notes

### Vue 3

- Uses Vue 3 Composition API
- Single File Components (`.vue` files)

### Browser Extension APIs

- Install `webextension-polyfill` for cross-browser compatibility

### Styling

- Vue scoped styles supported
- Content scripts: use `@addfox/utils` with Shadow DOM

## Resources

- Addfox docs: https://addfox.dev
- Rsbuild Vue plugin: https://rsbuild.dev/plugins/list/plugin-vue
- Vue 3 docs: https://vuejs.org
