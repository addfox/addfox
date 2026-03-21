# Migrate from Extension.js / CRXJS to Addfox

## Mapping overview

| Extension.js / CRXJS | Addfox |
|----------------------|---------|
| Vite + `@crxjs/vite-plugin` (or similar) | Rsbuild via Addfox; no Vite in pipeline |
| `manifest.json` + Vite entry points | `addfox.config.ts` + `app/` entry discovery or explicit `entry` |
| Vite output dir | `.addfox/extension/` |

## Steps

1. **Create addfox config**
   - Add `addfox.config.ts` at project root with `defineConfig`.
   - Port manifest from existing `manifest.json` into `manifest: { ... }` (or keep file-based manifest under `app/` or `app/manifest/`).

2. **Entry layout**
   - Place background, content, popup, options scripts under `app/` with standard names: `app/background/index.ts`, `app/content/index.ts`, `app/popup/index.ts`, etc.
   - If Extension.js used multiple content scripts, define each in `entry` and in manifest `content_scripts` with matching paths.

3. **Manifest**
   - Use `[addfox.content]` for content script `js` and `css` arrays so the framework fills output paths.
   - Background: Addfox outputs `background/index.js` (service worker); ensure `manifest.background.service_worker` is not overridden with a Vite-specific path.

4. **Dependencies and build**
   - Remove Vite and CRXJS/Extension.js plugin; add `addfox`.
   - Replace `vite build` / `vite dev` with `addfox dev` and `addfox build`.
   - For React/Vue/Svelte, use Addfox’s or Rsbuild’s framework plugins in config.

5. **Env and globals**
   - Replace Vite’s `import.meta.env` usage with Addfox’s `envPrefix` or Rsbuild `define` if needed.

## Extension.js-specific notes

- HMR: Addfox provides its own HMR for extension pages; behavior may differ from Vite HMR.
- Dynamic imports: supported by Rsbuild; ensure paths are valid for extension context (no dynamic host URLs unless allowed by CSP).
