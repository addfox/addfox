# Migrate from no-framework (vanilla) to Addfox

## Mapping overview

| Vanilla / no framework | Addfox |
|------------------------|---------|
| Hand-written `manifest.json` | `manifest` in `addfox.config.ts` or manifest files under `app/` |
| Ad-hoc JS bundles or no build | Rsbuild via Addfox; single build pipeline |
| Loose script paths | Reserved entry names and `app/` layout |

## Steps

1. **Create addfox config**
   - Add `addfox.config.ts` at project root.
   - Copy manifest fields from existing `manifest.json` into `defineConfig({ manifest: { ... } })`.
   - Ensure `manifest_version: 3` and `background.service_worker`, `action.default_popup`, etc. use framework output paths (e.g. `popup/index.html`, `background/index.js`).

2. **Create app directory**
   - Create `app/` and place entry scripts:
     - `app/background/index.js` or `index.ts` (service worker).
     - `app/content/index.js` or `index.ts` (content script).
     - `app/popup/index.html` + `app/popup/index.js` (or `.ts`) for popup; similarly for `options`, `sidepanel` if used.
   - If you had no build, convert inline scripts into entry files; avoid inline scripts in HTML for MV3/CSP.

3. **Manifest paths**
   - Use placeholders where applicable: e.g. content_scripts `js: ["[addfox.content]"]`, `css: ["[addfox.content]"]`.
   - Standard entry paths are defined in Addfox (e.g. `popup/index.html`, `background/index.js`); do not hardcode different paths unless using custom entries.

4. **Dependencies**
   - Install `addfox` as dev dependency.
   - Optionally add `webextension-polyfill` for cross-browser API.
   - Add TypeScript/React/Vue etc. only if you intend to use them.

5. **Scripts and assets**
   - Replace any manual copy/bundle scripts with `addfox dev` and `addfox build`.
   - Icons and static assets: place under `app/` and reference in manifest, or use Rsbuild `output.copy` for a `public/`-style folder.

## Vanilla-specific notes

- If the project had no bundler, ensure all imports are compatible with Rsbuild (ES modules, supported file types).
- Content script and background must not rely on Node-only APIs; use extension APIs and browser globals only.
