<p align="center">
  <img width="200" src="https://raw.githubusercontent.com/addfox/addfox/main/addfox.png" alt="Addfox">
</p>

# @addfox/rsbuild-plugin-extension-entry

[English](README.md) | 中文

---

Rsbuild 插件：根据 addfox 解析出的入口列表配置多入口、HTML 模板与 public 拷贝。由 CLI 流水线注入，用户无需直接配置。

- 多入口：popup、options、content、background、sidepanel、devtools 及自定义入口
- HTML 模板：真实入口必须是 JS/TS；模板内需唯一 `<script data-addfox-entry src="...">`
- entry 配置支持 `string` 或 `{ src, html }`（html 可为 `true` 或模板路径）
- 存在时拷贝 `public/` 到 dist
