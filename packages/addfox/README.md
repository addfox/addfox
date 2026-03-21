[中文](README-zh_CN.md) | English

---

<p align="center">
  <img width="230" src="addfox.png">
</p>

<h1 align="center">
Addfox
</h1>
<p align="center">
Browser extension development framework built on Rsbuild
</p>

Browser extension development involves more complex debugging, so we use **full-bundle mode** to minimize the gap between dev and production. Thanks to **Rsbuild’s performance**, addfox uses **build watch** for hot reload—same bundled output in dev and production, without sacrificing build speed.

## Quick start

### Option 1: Scaffold a new project

```bash
pnpm create addfox-app
# or
npx create-addfox-app
```

Follow the prompts: (1) framework (Vanilla / Vue / React / Preact / Svelte / Solid), (2) language (TypeScript / JavaScript), (3) package manager (pnpm / npm / yarn / bun), (4) entries to include, (5) whether to install addfox skills. A full project layout and `addfox.config` will be generated.

### Option 2: Add to an existing project

Install the main package **addfox** as a **dev dependency** (build tool; one install gives you the CLI and all build tooling; internally it uses `@addfox/cli` and `@rsbuild/core`):

```bash
pnpm add -D addfox
# or
npm install -D addfox
# or
yarn add -D addfox
```

Create `addfox.config.ts` (or `addfox.config.js` / `addfox.config.mjs`) in the project root and configure it as below. Your layout must include entries such as `background`, `content`, `popup`, `options`, `sidepanel` (under `app/` by default or under a dir set via `appDir`).

### Packages and imports

- **Core** (`defineConfig`, types, discovery, manifest, etc.) is exported from **addfox**. In config use: `import { defineConfig } from "addfox"`.
- **Content UI** is in **`@addfox/utils`**: `import { defineContentUI, mountContentUI } from "@addfox/utils"`. For the `browser` API, install [webextension-polyfill](https://github.com/mozilla/webextension-polyfill) and use `import browser from "webextension-polyfill"`.

## Config

Config file: `addfox.config.ts`, `addfox.config.js`, or `addfox.config.mjs`.

Return a config object from `defineConfig`. Supported fields:

| Field | Description |
|-------|-------------|
| **manifest** | Extension manifest. Single object or split as `chromium` / `firefox` |
| **plugins** | Rsbuild plugins array (like Vite). Use function calls, e.g. `plugins: [vue()]` (from `@addfox/rsbuild-plugin-vue`) or `plugins: [pluginReact()]` (from `@rsbuild/plugin-react`) |
| **rsbuild** | Override or extend Rsbuild config (like Vite’s build options). **Object**: deep-merged with base. **Function**: `(base, helpers) => config` for full control; use `helpers.merge(base, overrides)` for deep-merge |
| **entry** | Custom entries: object, key = entry name (reserved: popup, options, sidepanel, background, devtools, content; others custom), value = path string relative to baseDir (e.g. `'content/index.ts'`). Omit to use default discovery from appDir |
| **appDir** | App directory; default is `app/`. Also the base for **entry** paths |
| **outDir** | Output directory name under `.addfox`; default `"extension"` (output at `.addfox/extension`) |
| **browserPath** | Dev browser executable paths. `browserPath.chrome`, `browserPath.firefox`, etc.; used when running `addfox dev`. If unset, uses OS default install paths |
| **hooks** | Lifecycle hooks at “parse CLI → load config → build Rsbuild config → run build”. See “Lifecycle hooks” below |

### Lifecycle hooks

Configure `hooks` in `defineConfig`. Each hook receives `PipelineContext` (root, command, browser, config, entries, rsbuild, etc.):

| Hook | When |
|------|------|
| **afterCliParsed** | After CLI args (command, -b) are parsed |
| **afterConfigLoaded** | After config and entries are resolved |
| **beforeRsbuildConfig** | After manifest and entries are fixed, before Rsbuild config is built |
| **beforeBuild** | After Rsbuild config is ready, before build runs |
| **afterBuild** | After build finishes (only for `addfox build`; dev runs watch and does not exit) |

### Errors and exit codes

On missing config, no entries, invalid command or invalid `-b`, the CLI throws **AddfoxError** (with `code`, `details`, `hint`), prints a clear message to stderr and exits with a non-zero code. Error codes are exported from `addfox` as `ADDFOX_ERROR_CODES`.

### Config example

```ts
import { defineConfig } from "addfox";
import vue from "@addfox/rsbuild-plugin-vue";

export default defineConfig({
  appDir: "app",
  outDir: "extension",
  manifest: {
    name: "My Extension",
    version: "1.0.0",
    manifest_version: 3,
    permissions: ["storage", "activeTab"],
  },
  plugins: [vue()],
  // browserPath: { chrome: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", firefox: "..." },
  // rsbuild: (base, helpers) => helpers.merge(base, { ... }),
  // entry: { background: "background/index.ts", content: "content/index.ts", popup: "popup/index.ts" },
  // hooks: { beforeBuild: (ctx) => console.log("Building for", ctx.browser) },
});
```

## Directory and entry convention

- By default, entries are discovered under **app/** or **appDir** (baseDir). You can override with **entry**:
  - **background**, **content**: script only
  - **popup**, **options**, **sidepanel**, **devtools**: require `index.html` + entry script in the same dir
  - Reserved names (fixed): popup, options, sidepanel, background, devtools, content; other names are custom
  - **entry** values are paths relative to baseDir, e.g. `'content/index.ts'`, `'src/popup/index.ts'`

## Commands

In a project that has addfox installed:

- `addfox dev` or `pnpm dev` (if `"dev": "addfox dev"` in package.json): dev mode with watch and HMR (Reload Manager extension + local WebSocket)
- `addfox build`: production build to `.addfox/<outDir>` (default `outDir` is `"extension"`); optionally zips to `.addfox/<outDir>.zip`

**Terminal output**: When running `addfox dev` or `addfox build`, each line is prefixed with **`[addfox]`** so you can tell addfox’s output from Rsbuild’s; full Rsbuild logs and errors are unchanged.

Use **`-b, --browser <browser>`** to choose the target browser (and thus manifest branch and dev browser): `chromium`, `firefox`, `chrome`, `edge`, `brave`, etc.

- `addfox dev -b chrome` / `addfox dev -b firefox`
- `addfox build -b chrome` / `addfox build -b firefox`

Default is Chrome if `-b` is omitted. The target is determined only by `-b`, not by env vars.

## Dependencies

The framework follows common practice: **recommended dev dependencies** are checked before build and **installed automatically** when missing (using the project’s package manager: pnpm / npm / yarn / bun).

- **Extension development**: `@types/chrome` (Chrome extension API types) is installed as a dev dependency if not already in the project.
- **Plugins**: If you use `plugins: [vue()]`, the CLI ensures `vue` is installed. For React, use `@rsbuild/plugin-react` and add `react` and `react-dom` (and `@rsbuild/plugin-react`) to your project.

To skip auto-install (e.g. in CI or when you manage deps yourself), set **`ADDFOX_SKIP_DEPS=1`**.

- **addfox** brings in `@addfox/cli`, `@rsbuild/core`, and the framework plugins; you only need to add **addfox** to your project. Use `addfox dev` and `addfox build` in your scripts.

## Dev HMR

In dev, a WebSocket server is started and the extension is reloaded after each build. The Rsbuild plugin opens the browser and loads the extension after the first build; later rebuilds trigger a reload via WebSocket.

Browser paths: set **browserPath** in config to override; otherwise the framework tries OS default paths (Windows / macOS / Linux).

## Repo structure

- `packages/addfox`: **addfox** – main package users install; provides the `addfox` binary and delegates to `@addfox/cli` (same idea as installing `parcel` while internals live in `@parcel/*`)
- `packages/cli`: **@addfox/cli** – CLI entry and **Pipeline** (parse → config → Rsbuild config → hooks; injects ConfigLoader / CliParser)
- `packages/core`: Core modules; filenames match class names (camelCase): **ConfigLoader** (configLoader.ts), **CliParser** (cliParser.ts), **EntryDiscoverer** (entryDiscoverer.ts), **EntryResolver** (entryResolver.ts), **ManifestBuilder** (manifestBuilder.ts); constants, AddfoxError, mergeRsbuildConfig, defineConfig, types
- `packages/utils`: Utilities (webextension-polyfill etc.); use `@addfox/utils` as needed
- `packages/plugins/rsbuild-plugin-extension-entry`: **Internal** – resolves dirs and entries, sets entry/html/output (package: `@addfox/rsbuild-plugin-extension-entry`)
- `packages/plugins/rsbuild-plugin-extension-manifest`: **Internal** – writes manifest.json (package: `@addfox/rsbuild-plugin-extension-manifest`)
- `packages/plugins/rsbuild-plugin-extension-hmr**: **Internal** – dev HMR and browser launch
- `packages/plugins/rsbuild-plugin-vue`: Vue 3 + Vue JSX + Less + Babel; use `plugins: [vue()]`
- `packages/create-addfox-app`: Scaffold CLI; generates project with `plugins: [vue()]` or `plugins: [pluginReact()]` (use `@rsbuild/plugin-react` for React)

The framework runs rsbuild-plugin-extension-entry, rsbuild-plugin-extension-manifest and rsbuild-plugin-extension-hmr by default. Users add framework plugins via `plugins: [vue()]` etc. and override Rsbuild via `rsbuild`.
