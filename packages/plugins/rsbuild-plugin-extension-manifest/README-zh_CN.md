# @addfox/rsbuild-plugin-extension-manifest

[English](README.md) | 中文

---

Rsbuild 插件：构建结束后根据 CLI `-b`/`--browser` 或 config.browser 目标写入 manifest.json（按浏览器区分）。由 CLI 流水线注入。

- 使用 `@addfox/core` 的 `resolveManifestForTarget` 构建最终 manifest
- 处理 content script 输出（JS/CSS），展开 `[addfox.content]` 占位符
- 自动检测 shadow/iframe content UI 用法以控制 manifest 中的 CSS 自动填充
- 校验入口 HTML 规则（如 popup 必须有 HTML、MV3 下 background 不能有 HTML）
