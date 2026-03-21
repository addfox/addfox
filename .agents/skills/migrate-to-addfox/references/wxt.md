# Migrate from WXT to Addfox

## Mapping overview

| WXT | Addfox |
|-----|---------|
| `wxt.config.ts` | `addfox.config.ts` with `defineConfig` from `addfox` |
| `entrypoints/` or `src/` (per WXT layout) | `app/` (default `appDir`) |
| `public/` assets | `app/` or `outputRoot`; use Rsbuild `output.copy` if needed |
| WXT entry names (popup, options, background, content) | Same reserved names; use file-based layout: `app/popup/`, `app/background/`, etc. |
| `.output/` or WXT out dir | `.addfox/extension/` (default); zip at `.addfox/extension.zip` |

## Steps

1. **Create addfox config**
   - Add `addfox.config.ts` at project root.
   - Use `defineConfig({ manifest: { ... } })`; migrate manifest fields from WXT’s generated manifest or WXT config.
   - Set `appDir` to the directory that contains your entry scripts (e.g. `"app"` and move/copy WXT entry files under `app/`).

2. **Restructure entrypoints**
   - WXT uses `entrypoints/` (or similar). In Addfox, use `app/background/`, `app/content/`, `app/popup/`, `app/options/`, etc.
   - One entry script per reserved name (e.g. `app/background/index.ts`, `app/popup/index.ts`).
   - For content scripts, a single `app/content/index.ts` is the default; multiple content scripts require explicit `entry` and manifest `content_scripts` entries.

3. **Manifest**
   - Move shared manifest fields into `defineConfig({ manifest: { ... } })`.
   - Use `[addfox.content]` in `content_scripts[].js` and `content_scripts[].css` so the framework injects built paths.
   - For Chrome vs Firefox differences, use `manifest: { chromium: {...}, firefox: {...} }`.

4. **Dependencies**
   - Replace WXT with `addfox`. Install: `pnpm add -D addfox` (or npm/yarn).
   - Remove `wxt` and WXT-specific packages.
   - Add `webextension-polyfill` if you need cross-browser `browser.*` API.

5. **Scripts**
   - Replace `wxt dev` / `wxt build` with `addfox dev` and `addfox build`.
   - Use `addfox dev -l chrome` or `-l firefox` to launch browser; `-t chromium` / `-t firefox` for manifest target.

## WXT-specific notes

- WXT’s auto-imports or composables have no direct Addfox equivalent; reimplement with plain imports or small helpers.
- Icons and assets: put under `app/` and reference from manifest (e.g. `action.default_icon`); or use Rsbuild `output.copy` in `addfox.config.ts` to copy from a `public/`-style folder.
