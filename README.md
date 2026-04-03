<p align="center">
  <img width="200" src="addfox.png" alt="Addfox">
</p>

<h1 align="center">Addfox</h1>
<p align="center">Browser extension framework built on Rsbuild</p>

<div align="center">
  <a href="https://github.com/addfox/addfox/stargazers"><img src="https://img.shields.io/github/stars/addfox/addfox?style=flat-square" alt="GitHub stars"></a>
  <a href="https://www.npmjs.com/package/addfox"><img src="https://img.shields.io/npm/v/addfox?style=flat-square" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/addfox"><img src="https://img.shields.io/npm/dm/addfox?style=flat-square" alt="npm downloads"></a>
</div>
<div align="center">
  <a href="https://addfox.dev">Documentation</a> · <a href="https://www.npmjs.com/package/addfox">npm</a> · <a href="https://github.com/addfox/skills">Skills</a> · English | <a href="./README-zh_CN.md">中文</a>
</div>

---

## Architecture

Addfox wraps Rsbuild (Rspack/Rstack) with extension-specific plugins; build output is loaded in Chrome or Firefox.

<p align="center">
  <img src="addfox-architecture.png" alt="addfox → Rsbuild → Extension → Browsers" width="720">
</p>

---

## Features

- 🔥 **Fast dev + HMR** — `addfox dev` watches files, rebuilds on change, and hot-reloads the extension.
- 📦 **Zip on build** — `addfox build` outputs extension files and a store-ready zip in `.addfox`.
- 📁 **File-based entries** — Auto-discovers entries from `app/` (background/content/popup/options/sidepanel/devtools) with custom entry support.
- 🌐 **Cross-browser targets** — `-b` supports Chromium browsers and Firefox with browser-specific manifest overrides.
- ⚛️ **Framework-agnostic** — Works with Vue, React, Svelte, Solid, or vanilla (TS/JS).
- 🤖 **AI-friendly debugging** — `--debug` shows per-entry runtime errors in terminal.
- 🧪 **Built-in testing flow** — `addfox test` forwards args to Rstest for unit and e2e workflows.
- 📊 **Rsdoctor reports** — Add `--report` in dev/build to generate bundle analysis.
- 🧩 **Skills integration** — Supports [addfox/skills](https://github.com/addfox/skills) via scaffold or `skills add`.
- 🔐 **Env control** — Loads `.env` and exposes vars via `envPrefix` rules.

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

## Development & Benchmark

**Setup local links for benchmark:**

When developing addfox and testing against the benchmark suite:

```bash
# In addfox monorepo root
pnpm run setup:benchmark

# In benchmark/addfox directory
pnpm run link:addfox
```

**Run benchmark tests:**

```bash
# Dev startup time benchmark
cd ../benchmark && pnpm run test:addfox

# Build time & output size benchmark
cd ../benchmark && pnpm run build:addfox

# Batch benchmark all frameworks
cd ../benchmark && node scripts/batch-benchmark.mjs
```

See [benchmark/README.md](../benchmark/README.md) for full benchmark documentation.

---

**Full docs, config reference, and examples:** [https://addfox.dev](https://addfox.dev)  
**Skills (AI workflow modules):** [https://github.com/addfox/skills](https://github.com/addfox/skills)
