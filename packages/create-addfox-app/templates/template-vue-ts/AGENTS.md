# AI Agent Guide - Vue Addfox Extension

> **Priority**: Follow `.agents/skills/` first, then this guide, then [official docs](https://addfox.dev)

## Project Overview

Vue 3 browser extension using Addfox build tool. Uses `@rsbuild/plugin-vue` for SFC support.

## Key Configuration Fields (addfox.config.ts)

### Required Fields

- **`manifest`** - Extension manifest.json content
  - Supports `chromium` and `firefox` variants
  - Addfox auto-injects entry paths

- **`plugins`** - Rsbuild plugins array
  - Must include `pluginVue()` for Vue SFC support

### Optional Fields (use when needed)

- **`appDir`** - Source directory (default: "app")
- **`outDir`** - Build output directory (default: ".addfox/extension")
- **`entry`** - Manual entry mapping (when auto-discovery fails)
- **`hotReload`** - Dev server settings
- **`debug`** - Enable debug logging
- **`zip`** - Output zip configuration
- **`rsbuild`** - Override Rsbuild configuration

## Entry Structure

Entries auto-discovered from `appDir` subdirectories:

- `app/background/` → Service Worker (index.ts)
- `app/content/` → Content Script (index.ts)
- `app/popup/` → Popup page (index.ts + App.vue)
- `app/options/` → Options page
- `app/sidepanel/` → Side panel
- `app/devtools/` → DevTools page

## Framework-Specific Notes

### Vue 3

- Uses Vue 3 Composition API
- Single File Components (`.vue` files)
- TypeScript support enabled

### Browser Extension APIs

- Install `webextension-polyfill` for cross-browser compatibility
- Use in setup scripts or component methods

### Styling

- Vue scoped styles supported
- CSS Modules available
- Content scripts: use `@addfox/utils` with Shadow DOM

## Resources

- Addfox docs: https://addfox.dev
- Rsbuild Vue plugin: https://rsbuild.dev/plugins/list/plugin-vue
- Vue 3 docs: https://vuejs.org
- WebExtension API: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API
