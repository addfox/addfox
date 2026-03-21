# AI usage (@addfox/rsbuild-plugin-extension-monitor)

## Purpose

Dev-only Rsbuild plugin that injects error-monitoring code into entry scripts and emits the monitor UI assets under `_addfox-monitor/`. Injected by CLI pipeline; users do not configure it directly.

## When to use

- Only add it in **development** mode from the CLI pipeline
- Keep entry names and output paths derived from `EntryInfo[]`, never hardcode entry name lists

## Conventions

- All monitoring messages must include `__ADDFOX_DEBUG__: true` and an entry identifier
- Monitor assets must be emitted into `_addfox-monitor/` inside `outDir`
- Avoid throwing or logging in the injected runtime; failures must be silent

## When changing this package

- Ensure production builds do not include this plugin or any injected code
