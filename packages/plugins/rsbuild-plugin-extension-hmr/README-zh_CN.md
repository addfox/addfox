# @addfox/rsbuild-plugin-extension-hmr

[English](README.md) | 中文

---

Rsbuild 插件：dev 模式下等待 dist 就绪后启动浏览器（Chrome/Edge/Brave/Vivaldi/Opera/Santa/Firefox），并通过 WebSocket 实现 HMR 重载。由 CLI dev 命令使用。

- 选项：distPath、browser、chromePath/edgePath/bravePath/vivaldiPath/operaPath/santaPath/firefoxPath、wsPort、enableReload、persist
- **Chromium 启动**：通过 `chrome-launcher` 使用 CDP `Extensions.loadUnpacked` 原生加载扩展；旧版 Chrome 回退到 `--load-extension`
- **Firefox 启动**：通过 [web-ext run](https://extensionworkshop.com/documentation/develop/web-ext-command-reference/#web-ext-run)（`--target=firefox-desktop`）
- **重载管理器**：一个辅助扩展，监听 WebSocket 并在重新构建时切换（禁用+启用）开发扩展
- **浏览器路径注册表**：所有浏览器默认路径通过统一的 `BROWSER_DEFAULT_PATHS` 映射管理；用户可通过 `addfox.config.*` 覆盖
- 由 pipeline 根据 config.launch 与 CLI `-b`/`--browser` 注入
