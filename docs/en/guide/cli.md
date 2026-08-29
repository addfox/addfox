---
title: CLI
---

# CLI

This page lists the supported `addfox` CLI commands and options.

## Basic Usage

```bash
addfox <command> [options]
```

## Configure scripts in package.json

```json
{
  "scripts": {
    "dev": "addfox dev",
    "dev:firefox": "addfox dev -b firefox",
    "build": "addfox build",
    "build:chrome": "addfox build -b chrome",
    "test": "addfox test"
  }
}
```

## Commands

| Command | Description |
|--------|-------------|
| `dev` | Start development mode with hot reload support. |
| `build` | Build production output. |
| `test` | Run tests (forward args to rstest). |

> `addfox test` reads its config from `rstest.config.*` or the [`test`](/config/test) field in `addfox.config`; when both exist, `rstest.config.*` takes precedence.

## Common Options (Defaults + Config Mapping)

| Option | Built-in Default | `addfox.config` Field | Description |
|--------|------------------|------------------------|-------------|
| `-b, --browser <browser>` | `chromium` | No direct field (command-level target/launch selection) | Target/launch browser. See [Supported Browsers List](#supported-browsers-list) below. |
| `--port <port>` | `3000` | No direct field | Rsbuild dev server port. Only applies to `dev`. |
| `--keep-browser-profile` | `false` | `keepBrowserProfile` | Keep browser profile between launches (default: fresh profile each run). |
| `--no-keep-browser-profile` | `false` (for this run) | `keepBrowserProfile` | Use a fresh browser profile for current run. |
| `-r, --report` | `false` | `report` | Enable Rsdoctor build report. |
| `--no-open` | `false` (default is auto-open) | No direct field | Do not auto-open browser. |
| `--debug` | `false` | `debug` | Enable debug mode (error monitor in dev). |
| `--help` | - | - | Print help. |
| `--version` | - | - | Print version. |

> `-c, --cache` and `--no-cache` are deprecated aliases of `--keep-browser-profile` / `--no-keep-browser-profile`; they still work but print a deprecation warning in the terminal.

## Supported Browsers List

The `-b, --browser` option supports the following browsers:

| Browser | Description |
|---------|-------------|
| `chromium` | Chromium (default) |
| `chrome` | Google Chrome |
| `edge` | Microsoft Edge |
| `brave` | Brave Browser |
| `vivaldi` | Vivaldi |
| `opera` | Opera |
| `santa` | Santa Browser |
| `arc` | Arc Browser |
| `yandex` | Yandex Browser |
| `browseros` | BrowserOS |
| `custom` | Custom browser (requires `browser.custom` in config) |
| `firefox` | Mozilla Firefox |

## Examples

```bash
# Development (Chromium)
addfox dev -b chromium

# Development on a custom port
addfox dev --port 3100 -b edge

# Development (Firefox) with debug monitor
addfox dev -b firefox --debug

# Production build
addfox build -b chrome

# Build without opening browser
addfox build -b chrome --no-open

# Build with report
addfox build -r
```

## Entry Paths and HTML Templates

Entry paths passed to `entry` or discovered by the framework can point to either a **script** (`.ts/.tsx/.js/.jsx`) or an **HTML template** (`.html`).

- **Script path**: the framework uses the script as the build entry and auto-generates HTML for entries that need it.
- **HTML path**: you can write the entry path as `popup/index.html`, but you must still tell the framework which script is the entry. Do this by adding `data-addfox-entry` to a `<script type="module">` tag in the HTML, or by placing a sibling script file (`index.ts` / `index.tsx`) next to the HTML so the framework can resolve it automatically.

See [Config-based Entry](/guide/entry/config-based) for details and examples.
