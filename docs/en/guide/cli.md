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

## Common Options (Defaults + Config Mapping)

| Option | Built-in Default | `addfox.config` Field | Description |
|--------|------------------|------------------------|-------------|
| `-b, --browser <browser>` | `chromium` | No direct field (command-level target/launch selection) | Target/launch browser. See [Supported Browsers List](#supported-browsers-list) below. |
| `-c, --cache` | `true` | `cache` | Enable browser profile cache for current run. |
| `--no-cache` | `false` (for this run) | `cache` | Disable browser profile cache for current run. |
| `-r, --report` | `false` | `report` | Enable Rsdoctor build report. |
| `--no-open` | `false` (default is auto-open) | No direct field | Do not auto-open browser. |
| `--debug` | `false` | `debug` | Enable debug mode (error monitor in dev). |
| `--help` | - | - | Print help. |
| `--version` | - | - | Print version. |

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

# Development (Firefox) with debug monitor
addfox dev -b firefox --debug

# Production build
addfox build -b chrome

# Build without opening browser
addfox build -b chrome --no-open

# Build with report
addfox build -r
```

## Notes

- `--debug` mainly affects `dev` mode.
- `--no-cache` is useful for clean-state debugging; `cache` can still be set as project default in config.
- `-b/--browser` does not have a dedicated config field and is intended as a command-level choice.
