<p align="center">
  <img width="200" src="addfox.png" alt="Addfox">
</p>

<h1 align="center">Addfox</h1>
<p align="center">Browser extension framework built on Rsbuild</p>

<div align="center">
  <a href="https://addfox.dev">Documentation</a> · <a href="https://www.npmjs.com/package/addfox">npm</a> · <a href="https://github.com/addfox/skills">Skills</a>
</div>

---

## Architecture

Addfox wraps Rsbuild (Rspack/Rstack) with extension-specific plugins; build output is loaded in Chrome or Firefox.

<p align="center">
  <img src="addfox-architecture.png" alt="addfox → Rsbuild → Extension → Browsers" width="720">
</p>

---

## Features

- 🔥 **Fast dev mode and hot reload** — `addfox dev` runs watch, rebuilds on change, and hot-reloads the extension in the browser; the browser launches automatically; same bundle as production.
- 📦 **Auto-generated zip** — After `addfox build`, output is packed into a zip under `.addfox` by default; one command for both folder and store-ready zip.
- 📁 **File-based entries** — Entries are discovered from `app/` layout (background, content, popup, options, sidepanel, devtools); override or add custom entries in config when needed.
- 🌐 **Many Chromium browsers and Firefox** — Use `-b chrome|edge|brave|vivaldi|opera|firefox|...` to target Chrome, Edge, Brave, Vivaldi, Opera, Arc, Yandex, or Firefox; manifest can be split per browser.
- ⚛️ **Framework-agnostic** — Vue, React, Svelte, Solid, or vanilla; TypeScript or JavaScript; choose in scaffold or add the plugin you need.
- 🤖 **AI-friendly error output** — Enable `--debug` for a dev-only error panel with per-entry errors, Copy prompt, Ask ChatGPT, and Ask Cursor in one click.
- 🧪 **Rstest support** — Run `addfox test` for unit and e2e tests; arguments are forwarded to Rstest.
- 📊 **Rsdoctor bundle analysis** — Add `--report` to build or dev to open the Rsdoctor analysis report after the build.
- 🧩 **Full Skills support** — Install [addfox/skills](https://github.com/addfox/skills) via create-addfox-app or `skills add`; AI workflow modules in `.agents/skills/`.
- 🔐 **Env variable support** — `.env` is loaded; `envPrefix` controls which vars are exposed to the extension (e.g. `PUBLIC_`).

## Install & use

**New project:**

```bash
pnpm create addfox-app
# or: npx create-addfox-app
```

Choose framework (Vanilla / Vue / React / Preact / Svelte / Solid), language, package manager, entries, and optional [Skills](https://github.com/addfox/skills). A full layout and `addfox.config` are generated.

**Existing project:**

```bash
pnpm add -D addfox
```

Add `addfox.config.ts` (or `.js` / `.mjs`) in the project root and entries under `app/` (or `appDir`). Then:

- `addfox dev` — dev with watch + HMR
- `addfox build` — output to `.addfox/extension` (and optional zip)

Use `-b chrome` or `-b firefox` to target a browser.

---

**Full docs, config reference, and examples:** [https://addfox.dev](https://addfox.dev)  
**Skills (AI workflow modules):** [https://github.com/addfox/skills](https://github.com/addfox/skills)
