# CLI

This page lists the supported `addfox` CLI commands and options.

## Basic Usage

```bash
addfox <command> [options]
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
| `-b, --browser <browser>` | `chromium` | No direct field (command-level target/launch selection) | Target/launch browser. Examples: `chromium`, `firefox`, `chrome`, `edge`, `brave`. |
| `-c, --cache` | `true` | `cache` | Enable browser profile cache for current run. |
| `--no-cache` | `false` (for this run) | `cache` | Disable browser profile cache for current run. |
| `-r, --report` | `false` | `report` | Enable Rsdoctor build report. |
| `--no-open` | `false` (default is auto-open) | No direct field | Do not auto-open browser. |
| `--debug` | `false` | `debug` | Enable debug mode (error monitor in dev). |
| `--help` | - | - | Print help. |
| `--version` | - | - | Print version. |

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
