# Migrate from Plasmo to Addfox

## Mapping overview

| Plasmo | Addfox |
|--------|---------|
| `package.json` manifest / `popup.ts`, `background.ts`, etc. at repo root or in `src/` | `app/` with `app/popup/`, `app/background/`, etc. |
| Plasmo content: `content.ts` or `contents/` | `app/content/index.ts` (single) or multiple via `entry` + manifest |
| Plasmo config in `package.json` or `plasmo.config.*` | `addfox.config.ts` with `defineConfig` |
| `.plasmo/` or Plasmo output | `.addfox/extension/` and `.addfox/extension.zip` |

## Steps

1. **Create addfox config**
   - Add `addfox.config.ts` at project root.
   - Export config with `defineConfig({ manifest: { ... } })`.
   - Port manifest from Plasmo’s generated manifest or from `package.json` "manifest" field.

2. **Restructure to app dir**
   - Create `app/` (or set `appDir` to another folder).
   - Move `popup.tsx` → `app/popup/index.tsx`, `background.ts` → `app/background/index.ts`, `content.ts` → `app/content/index.ts`, etc.
   - Plasmo’s `tabs/` or multiple content scripts: map to separate entry names and list them in `entry` and in manifest `content_scripts`.

3. **Manifest**
   - Use inline `manifest` in config or manifest files under `app/` or `app/manifest/`.
   - Use `[addfox.content]` for content script paths.
   - For React/Vue/Svelte, keep using the same UI libraries; Addfox uses Rsbuild, so configure framework plugins (e.g. `react()`) in `addfox.config.ts` via `rsbuildConfig` or use addfox’s provided plugins.

4. **Dependencies**
   - Add `addfox` as dev dependency; remove `plasmo` and Plasmo-specific deps after migration.
   - Keep React/Vue/Svelte and UI deps; add `webextension-polyfill` if needed for cross-browser.

5. **Scripts**
   - Replace `plasmo dev` / `plasmo build` with `addfox dev` and `addfox build`.
   - Use `-l chrome` / `-l firefox` and `-t chromium` / `-t firefox` as needed.

## Plasmo-specific notes

- Plasmo’s messaging helpers and storage wrappers have no 1:1 in Addfox; reimplement with `chrome.runtime.sendMessage` / `chrome.storage` or webextension-polyfill.
- CSP and inline scripts: Addfox/Rsbuild output follows MV3 best practices; avoid inline scripts in HTML.
- Environment variables: use Addfox’s `envPrefix` or Rsbuild’s `define` / `loadEnv` for build-time env.
