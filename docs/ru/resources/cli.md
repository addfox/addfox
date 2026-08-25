---
title: '@addfox/cli'
---

# @addfox/cli

The `addfox` CLI entry point: it parses arguments, runs the config → entry → Rsbuild pipeline, wraps terminal output, and drives Rsbuild for `dev` / `build`.

You can use it programmatically to build custom extension tooling on top of Addfox.

## Installation

```bash
npm install @addfox/cli
```

## What it does

- Parses `addfox dev | build | test [options]` from `process.argv`
- Loads and resolves `addfox.config.ts`
- Discovers or validates extension entries
- Builds the final Rsbuild configuration
- Starts the dev server or runs a production build
- Optionally launches the browser with the extension loaded

## Commands

| Command | Description |
|---------|-------------|
| `dev` | Start development mode with hot reload support |
| `build` | Build production output |
| `test` | Run tests (forwards args to rstest) |

## Common Options

| Option | Description |
|--------|-------------|
| `-b, --browser <browser>` | Target/launch browser |
| `--port <port>` | Rsbuild dev server port (dev only, default `3000`) |
| `--no-open` | Do not auto-open browser |
| `--keep-browser-profile` | Keep browser profile between launches |
| `--no-keep-browser-profile` | Use a fresh browser profile for this run |
| `-r, --report` | Enable Rsdoctor build report |
| `--debug` | Enable debug mode |

> `-c, --cache` and `--no-cache` are deprecated aliases of `--keep-browser-profile` / `--no-keep-browser-profile`; they still work but print a deprecation warning.

## Dev server and HMR

`addfox dev` uses **Rsbuild dev server** with `writeToDisk: true` so the extension can be loaded from `.addfox/<outDir>`. The `@addfox/rsbuild-plugin-extension-hmr` plugin handles full extension reload when build output changes, so the extension works from both disk and `chrome-extension://` origins.

## Programmatic usage

Most users will call the CLI binary. If you need to embed the CLI in another tool, import from `@addfox/cli` and call the same pipeline functions used by the binary.
