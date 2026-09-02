<p align="center">
  <img width="200" src="addfox.png" alt="Addfox">
</p>

<h1 align="center">Addfox</h1>

<p align="center">
  <strong>The browser extension framework built on Rstack.</strong><br>
  Fast builds, real HMR, powerful browser launching — one project for Chrome &amp; Firefox.
</p>

<div align="center">
  <a href="https://github.com/addfox/addfox/stargazers"><img src="https://img.shields.io/github/stars/addfox/addfox?style=flat-square" alt="GitHub stars"></a>
  <a href="https://www.npmjs.com/package/addfox"><img src="https://img.shields.io/npm/v/addfox?style=flat-square" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/addfox"><img src="https://img.shields.io/npm/dm/addfox?style=flat-square" alt="npm downloads"></a>
  <a href="./LICENSE"><img src="https://img.shields.io/npm/l/addfox?style=flat-square" alt="MIT license"></a>
</div>
<div align="center">
  <a href="https://addfox.dev">Documentation</a> · <a href="https://www.npmjs.com/package/addfox">npm</a> · <a href="https://github.com/addfox/benchmark">Benchmark</a> · <a href="https://github.com/addfox/skills">Skills</a> · English | <a href="./README-zh_CN.md">中文</a>
</div>

---

## Why Addfox?

- **Rstack performance** — built on [Rsbuild](https://rsbuild.dev) (Rspack): fast cold starts, fast HMR, fast production builds.
- **Real HMR everywhere** — background, content scripts, popup, options… all hot-reload, no manual extension refresh.
- **Powerful browser launching** — auto-detects and launches Chromium browsers and Firefox, with profile and cache control built in.
- **Any UI framework** — Vue, React, Preact, Svelte, Solid, or vanilla. No wrappers, no adapters.
- **One project, every browser** — shared codebase with per-browser manifest overrides.

## Benchmarks

The same extension project, built with each framework (lower is better):

| Framework | Build tool | Dev startup | Production build | Output size |
| --------- | ---------- | ----------- | ---------------- | ----------- |
| **Addfox 0.2.9** | **Rsbuild 2.2.1** | **1.56s** | **1.04s** | **837KB** |
| WXT 0.21.4 | Vite 8.1.2 | 1.99s | 1.64s | 810KB |
| Extension.js 4.1.5 | Rspack 2.2.1 | 2.86s | 1.61s | 1.91MB |
| Plasmo 0.90.5 | Parcel 2.9.3 | 2.91s | 2.54s | 1.37MB |

<sub>Benchmarked on identical projects; results may vary with project complexity. Methodology &amp; reproduction: [addfox/benchmark](https://github.com/addfox/benchmark).</sub>

## How it compares

WXT (Vite), Plasmo (Parcel), and Extension.js (Rspack) are all excellent tools. Addfox carves its own path:

| Solution | Build tool | Dev experience | Flexibility |
| -------- | ---------- | -------------- | ----------- |
| Plasmo | Parcel | Out-of-the-box | Convention-based, with cloud features |
| WXT | Vite | Out-of-the-box | Convention-based, with plugin ecosystem |
| Extension.js | Rspack | Out-of-the-box | Zero-config, minimal setup |
| **Addfox** | **Rsbuild** | **Out-of-the-box** | **Minimal conventions, full Rsbuild ecosystem** |

**Where Addfox is different:**

- **Rsbuild speed** — fastest dev startup and build in its class (see benchmarks above).
- **Full Rstack ecosystem** — Rsdoctor bundle analysis and Rstest testing built in.
- **Maximum freedom** — no enforced file structures or custom APIs; use your preferred patterns.
- **AI-ready** — generates `llms.txt` metadata, streams runtime errors to the terminal (`--debug`), and supports [skills](https://github.com/addfox/skills) for AI-assisted workflows.

## Features

| | |
| - | - |
| 🔥 **Fast dev + HMR** | Dedicated reload plugin; content scripts and background hot-update |
| 🚀 **Browser launcher** | Auto-detect & launch Chromium / Firefox; profile and cache control; `--keep-browser-profile` |
| 📁 **File-based entries** | Auto-discovers `app/` entries (background / content / popup / options / sidepanel / devtools) |
| 🌐 **Cross-browser** | Chromium browsers + Firefox, per-browser manifest overrides |
| ⚛️ **Any framework** | Vanilla, Vue, React, Preact, Svelte, Solid — TS or JS |
| 🧩 **Content UI** | Built-in `createContentUI`: Iframe, Shadow DOM, or inline injection |
| 📦 **Zip on build** | `addfox build` outputs the extension and a store-ready zip |
| 🧪 **Testing** | `addfox test` forwards to Rstest for unit and e2e workflows |
| 📊 **Bundle analysis** | `--report` generates Rsdoctor reports in dev/build |
| 🔐 **Env control** | Loads `.env`, exposes variables via `envPrefix` rules |
| 🤖 **AI-ready** | `llms.txt` metadata, terminal error output, skills integration |

## Architecture

Addfox wraps Rsbuild with extension-specific plugins; build output loads directly in Chrome or Firefox.

<p align="center">
  <img src="addfox-architecture.png" alt="addfox → Rsbuild → Extension → Browsers" width="720">
</p>

## Quick start

**New project:**

```bash
npx addfox@latest create
# or: pnpm dlx addfox@latest create
# or: pnpm create addfox-app (legacy)
```

Pick a framework, language, package manager, and entries — a full project with `addfox.config` is generated. Then:

```bash
cd my-extension
pnpm dev
```

Edit `app/popup/index.tsx`, save, and the extension reloads itself.

**Existing project:**

```bash
pnpm add -D addfox
```

Add `addfox.config.ts` and entries under `app/`. Then:

- `addfox dev` — dev server with watch + HMR
- `addfox build` — output to `.addfox/extension` (plus optional zip)

Use `-b chrome` or `-b firefox` to pick a target browser.

## Examples

The [`examples/`](./examples) directory contains ready-to-run projects: React, Vue, Svelte, Solid, content UI, devtools, i18n, env vars, Firefox targets, and more.

## Repository structure

```
addfox/
├── packages/            # Monorepo packages
│   ├── addfox/          # The `addfox` npm package (CLI entry)
│   ├── cli/             # @addfox/cli — dev / build / test commands
│   ├── core/            # @addfox/core — config resolution & Rsbuild pipeline
│   ├── launcher/        # @addfox/launcher — browser detection & launch
│   ├── plugins/         # Rsbuild plugins (HMR, manifest, zip, …)
│   └── create-addfox-app/  # Project scaffolding
├── examples/            # Example extensions (React, Vue, Svelte, …)
├── e2e/                 # Playwright end-to-end tests
└── docs/                # Documentation site source (https://addfox.dev)
```

## Contributing

Issues and pull requests are welcome at [github.com/addfox/addfox](https://github.com/addfox/addfox). When reporting a bug, please include steps to reproduce, expected vs actual behavior, and your browser / OS details.

## Show your support

If Addfox makes your extension development easier, give us a ⭐ on [GitHub](https://github.com/addfox/addfox/stargazers) — it helps more developers discover the project.

## License

[MIT](./LICENSE)

---

**Full docs, config reference, and guides:** [https://addfox.dev](https://addfox.dev)
**Skills (AI workflow modules):** [https://github.com/addfox/skills](https://github.com/addfox/skills)
