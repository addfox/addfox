# Dev server and HMR (Tailwind / PostCSS)

`addfox dev` uses **rsbuild dev** (`rsbuild.startDevServer()`) with **writeToDisk** so the extension can load from **`.addfox/<outDir>`** (e.g. `.addfox/dist`). Rsbuild’s built-in HMR is **disabled** (`dev.hmr: false`, `dev.liveReload: false`) because the extension runs from disk and from `chrome-extension://` or page origins; the default HMR WebSocket URL would be wrong and cause connection errors. Reload is handled by **plugin-extension-hmr** (full extension reload when build output changes).

## Config in dev

| Option | Where | What it does |
|--------|--------|----------------|
| **dev + writeToDisk** | [src/pipeline.ts](../src/pipeline.ts) – `buildHmrOverrides` | Sets `dev.hmr: false`, `dev.liveReload: false`, and `dev.writeToDisk: (filename) => !filename.includes('.hot-update.')` so no Rsbuild HMR client is injected (no WebSocket errors in extension); normal assets are still written to disk for the extension. |
| **Extension reload** | Same file – `tools.rspack` | Injects plugin-extension-hmr so the extension reloads when build output changes. |
| **Watch ignore output** | [@addfox/rsbuild-plugin-extension-entry](../../plugins/rsbuild-plugin-extension-entry/src/index.ts) – `onBeforeCreateCompiler` | Adds the build output path (`distPath` = `.addfox/<outDir>`) to Rspack’s `watchOptions.ignored`, so file changes in the output directory do not trigger another build. |

## Why filter writeToDisk

- **Tailwind / PostCSS**: PostCSS (e.g. `@tailwindcss/postcss`) expands the CSS dependency graph; in watch mode, more file changes mean more incremental builds.
- **Filter**: `writeToDisk: (filename) => !filename.includes('.hot-update.')` writes normal build output to disk for the extension but skips hot-update files. Together with `watchOptions.ignored` on the output path, this keeps dev stable with Tailwind/PostCSS.

## If you still see rebuild loops or hot-update files

Ensure you are on a recent addfox version that includes the above. No project-side config is required beyond your normal `postcss.config.mjs` and Tailwind setup.
