# AI Agent Guide - React Addfox Extension

> **Priority**: Follow `.agents/skills/` first, then this guide, then [official docs](https://addfox.dev)

## Project Overview

React-based browser extension using Addfox build tool. Uses `@rsbuild/plugin-react` for JSX support and React Fast Refresh.

## Key Configuration Fields (addfox.config.js)

### Required Fields

- **`manifest`** - Extension manifest.json content
  - Supports `chromium` and `firefox` variants for browser-specific differences
  - Addfox auto-injects entry paths - don't hardcode them

- **`plugins`** - Rsbuild plugins array
  - Must include `pluginReact()` for JSX support

### Optional Fields (use when needed)

- **`appDir`** - Source directory (default: "app")
- **`outDir`** - Build output directory (default: ".addfox/extension")
- **`entry`** - Manual entry mapping (when auto-discovery fails)
- **`hotReload`** - Dev server settings (port, auto-refresh)
- **`debug`** - Enable debug logging
- **`zip`** - Output zip configuration
- **`rsbuild`** - Override Rsbuild configuration

## Entry Structure

Entries auto-discovered from `appDir` subdirectories:

- `app/background/` → Service Worker
- `app/content/` → Content Script
- `app/popup/` → Popup page
- `app/options/` → Options page
- `app/sidepanel/` → Side panel
- `app/devtools/` → DevTools page

Each needs `index.jsx` as entry point.

## Framework-Specific Notes

### React/JSX

- Files use `.jsx` extension
- React Fast Refresh enabled in dev mode
- JSX transform automatic

### Browser Extension APIs

- Install `webextension-polyfill` for cross-browser compatibility
- Import: `import browser from "webextension-polyfill"`

### Styling

- Supports CSS Modules
- Supports Tailwind if configured
- Content scripts: use `@addfox/utils` with Shadow DOM for isolation

## Resources

- Addfox docs: https://addfox.dev
- Rsbuild React plugin: https://rsbuild.dev/plugins/list/plugin-react
- WebExtension API: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API
