# AI usage (@addfox/cli)

## Purpose

Provides the `addfox` executable: when running `addfox dev` or `addfox build` from project root, this package parses argv, loads config, builds Rsbuild config and starts the build.

## When to use

- Users **running addfox from the CLI** install this package (or a meta package that depends on its bin)
- To **reuse addfox’s build flow in scripts or tools**, use `runPipeline` from `@addfox/core` (exported from core and used in cli’s pipeline) instead of spawning an `addfox` subprocess

## Flow summary

1. Check that addfox.config.ts / addfox.config.js / addfox.config.mjs exists in cwd
2. Parse argv → command (dev/build), browser (chromium/firefox)
3. ConfigLoader.resolve → config, entries
4. Build Rsbuild config (entry plugin, manifest plugin, HMR plugin, user plugins/rsbuildConfig)
5. If enabled, wrap stdout/stderr with `[addfox]` prefix via `wrapAddfoxOutput`
6. Run Rsbuild build (watch in dev)

## When changing this package

- New commands or flags require updates in `cli.ts` and `@addfox/core`’s CliParser/constants
- Pipeline order or plugin injection lives in `pipeline.ts`; keep rsbuild-plugin-extension-entry, rsbuild-plugin-extension-manifest, rsbuild-plugin-extension-hmr contracts in mind
