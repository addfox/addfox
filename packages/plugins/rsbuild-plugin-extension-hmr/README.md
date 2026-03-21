# @addfox/rsbuild-plugin-extension-hmr

[中文](README-zh_CN.md) | English

---

Rsbuild plugin: in dev, waits for dist then launches the browser (Chrome/Edge/Brave/Vivaldi/Opera/Santa/Firefox) and enables HMR reload via WebSocket. Used by CLI dev command.

- Options: distPath, browser, chromePath/edgePath/bravePath/vivaldiPath/operaPath/santaPath/firefoxPath, wsPort, enableReload, persist
- **Chromium launch**: uses `chrome-launcher` with CDP `Extensions.loadUnpacked` for native extension loading; falls back to `--load-extension` on older Chrome versions
- **Firefox launch**: uses [web-ext run](https://extensionworkshop.com/documentation/develop/web-ext-command-reference/#web-ext-run) (`--target=firefox-desktop`)
- **Reload manager**: a helper extension that listens to WebSocket and toggles (disable+enable) dev extensions on rebuild
- **Browser path registry**: all browser default paths are managed via a single `BROWSER_DEFAULT_PATHS` map; user can override via `config.launch.*`
- Injected by pipeline from config.launch and CLI `-b`/`--browser`
