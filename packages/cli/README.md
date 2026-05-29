<p align="center">
  <img width="200" src="https://raw.githubusercontent.com/addfox/addfox/main/addfox.png" alt="Addfox">
</p>

# @addfox/cli

[中文](README-zh_CN.md) | English

---

addfox CLI entry: parses argv, runs pipeline (load config → build Rsbuild config), wraps output with prefix, and runs Rsbuild for `dev` / `build`.

- Commands: `addfox dev`, `addfox build [-b chrome|edge|brave|vivaldi|opera|santa|firefox]`
- Depends on `@addfox/core` for config and entry resolution; depends on plugins for Rsbuild logic

## Dev server and HMR (Tailwind / PostCSS)

`addfox dev` uses **rsbuild dev** (`rsbuild.startDevServer()`) with **writeToDisk** so the extension can load from **`.addfox/<outDir>`** (e.g. `.addfox/dist`). The extension runs from disk and from `chrome-extension://` or page origins; Rsbuild’s default HMR WebSocket client would fail to connect in these contexts. Instead, **plugin-extension-hmr** handles full extension reload when build output changes, and content/background entries get an HMR-noop injection to prevent WebSocket connection errors.

### Config in dev

| Option | Where | What it does |
|--------|--------|----------------|
| **dev + writeToDisk** | [src/pipeline.ts](src/pipeline.ts) – `buildHmrOverrides` | Sets `dev.writeToDisk: true` so all build output is written to disk for the extension to load. When `hotReload` is enabled, `hmr: true` and `liveReload: true` are also set so rsbuild re-compiles on source changes. |
| **Extension reload** | Same file – `tools.rspack` | Injects plugin-extension-hmr so the extension reloads when build output changes. |
| **Watch ignore output** | [@addfox/rsbuild-plugin-extension-entry](../plugins/rsbuild-plugin-extension-entry/src/index.ts) – `onBeforeCreateCompiler` | Adds the build output path (`distPath` = `.addfox/<outDir>`) and the glob pattern `"**/.addfox/**"` to Rspack’s `watchOptions.ignored`, so file changes in the output directory do not trigger another build. |

### Why watch ignore matters

- **Tailwind / PostCSS**: PostCSS (e.g. `@tailwindcss/postcss`) expands the CSS dependency graph; in watch mode, more file changes mean more incremental builds.
- **Build output**: `writeToDisk: true` writes all build output (including `.hot-update.*` files when HMR is active) to `.addfox/<outDir>`. Without `watchOptions.ignored`, changes in the output directory would be picked up by the watcher and trigger another build, causing an infinite loop.
- **Ignore strategy**: `watchOptions.ignored` adds both the absolute path of the output root and the glob pattern `"**/.addfox/**"` to ensure the output directory is excluded from watching across all platforms.

### If you still see rebuild loops

Ensure you are on a recent addfox version that includes the above. No project-side config is required beyond your normal `postcss.config.mjs` and Tailwind setup.
