# AI usage (@addfox/rsbuild-plugin-extension-hmr)

## Purpose

Rsbuild plugin for **dev mode**: after dist is ready, launches Chrome or Firefox and loads the extension; optionally enables HMR reload (WebSocket + injected script).

## When to use

- Injected by **CLI pipeline** in dev; users set browser path via addfox.config `browserPath.chrome` / `browserPath.firefox` or env (BROWSER_CHROME / BROWSER_FIREFOX)
- If reusing addfox’s dev flow in a custom script, inject this plugin and pass distPath, browser, etc.

## Conventions

- Browser path: config.launch.chrome / launch.firefox; if unset, try OS default paths (DEFAULT_CHROME_PATHS / DEFAULT_FIREFOX_PATHS defined in this plugin)
- HMR port etc. aligned with core’s HMR_WS_PORT

## When changing this package

- This plugin only handles “launch browser” and “HMR”; build is done by Rsbuild and rsbuild-plugin-extension-entry/rsbuild-plugin-extension-manifest
