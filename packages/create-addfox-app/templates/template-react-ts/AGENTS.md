# AI Agent Guide - React Addfox Extension

> **Priority**: Follow `.agents/skills/` first, then this guide, then [official docs](https://addfox.dev)

## Project Overview

React-based browser extension using Addfox build tool. Uses `@rsbuild/plugin-react` for JSX/TSX support and React Fast Refresh.

## Key Configuration Fields (addfox.config.ts)

### Required Fields

- **`manifest`** - Extension manifest.json content
  - Supports `chromium` and `firefox` variants for browser-specific differences
  - Addfox auto-injects entry paths (popup, background, etc.) - don't hardcode them

- **`plugins`** - Rsbuild plugins array
  - Must include `pluginReact()` for JSX/TSX support
  - Add other Rsbuild plugins as needed

### Optional Fields (use when needed)

- **`appDir`** - Source directory (default: "app")
  - Change if source files are in a different folder

- **`outDir`** - Build output directory (default: ".addfox/extension")
  - Change for custom output location

- **`entry`** - Manual entry point mapping
  - Only needed when auto-discovery fails or custom structure

- **`hotReload`** - Dev server settings
  - `port`: WebSocket port (default: 23333)
  - `autoRefreshContentPage`: Auto-refresh on content changes

- **`debug`** - Enable debug logging (default: false)

- **`zip`** - Output zip configuration for distribution

- **`rsbuild`** - Override Rsbuild configuration directly

## Entry Structure

Entries auto-discovered from `appDir` subdirectories:

- `app/background/` → Service Worker
- `app/content/` → Content Script  
- `app/popup/` → Popup page
- `app/options/` → Options page
- `app/sidepanel/` → Side panel
- `app/devtools/` → DevTools page

Each needs `index.tsx` as entry point.

## Framework-Specific Notes

### React/JSX

- Files use `.tsx` extension
- React Fast Refresh enabled in dev mode
- JSX transform automatic (no need to import React)

### Browser Extension APIs

- Install `webextension-polyfill` for cross-browser compatibility
- Import: `import browser from "webextension-polyfill"`

### Styling

- Supports CSS Modules: `import styles from "./App.module.css"`
- Supports Tailwind if configured
- For content scripts: use `@addfox/utils` with Shadow DOM for isolation

## Common Tasks

Adding a new entry:
1. Create `app/<entry-name>/index.tsx`
2. Addfox auto-detects - no config change needed
3. Reference in manifest if needed (paths auto-injected)

Adding permissions:
1. Edit `manifest.permissions` in config
2. Firefox may need different permission format

Cross-browser manifest differences:
- Use `manifest.chromium` and `manifest.firefox` objects
- Common fields go in both, differences separated

## Resources

- Addfox docs: https://addfox.dev
- Rsbuild React plugin: https://rsbuild.dev/plugins/list/plugin-react
- WebExtension API: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API
