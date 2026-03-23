<p align="center">
  <img width="200" src="addfox.png" alt="Addfox">
</p>

<h1 align="center">Addfox</h1>
<p align="center">基于 Rsbuild 的浏览器扩展开发框架</p>

<div align="center">
  <a href="https://github.com/addfox/addfox/stargazers"><img src="https://img.shields.io/github/stars/addfox/addfox?style=flat-square" alt="GitHub stars"></a>
  <a href="https://www.npmjs.com/package/addfox"><img src="https://img.shields.io/npm/v/addfox?style=flat-square" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/addfox"><img src="https://img.shields.io/npm/dm/addfox?style=flat-square" alt="npm downloads"></a>
</div>
<div align="center">
  <a href="https://addfox.dev">官方文档</a> · <a href="https://www.npmjs.com/package/addfox">npm</a> · <a href="https://github.com/addfox/skills">Skills</a> · <a href="./README.md">English</a> | 中文
</div>

---

## 架构

Addfox 基于 Rsbuild（Rspack/Rstack）封装扩展能力；构建产物在 Chrome 或 Firefox 中加载。

<p align="center">
  <img src="addfox-architecture.png" alt="addfox → Rsbuild → 扩展 → 浏览器" width="720">
</p>

---

## 特点

- 🔥 **快速开发与热更新** — `addfox dev` 监听变更并自动重建、热重载扩展。
- 📦 **构建即打包 zip** — `addfox build` 同时输出扩展目录与 `.addfox` 下可上架 zip。
- 📁 **文件式入口** — 从 `app/` 自动发现 background/content/popup/options/sidepanel/devtools，并支持自定义入口。
- 🌐 **跨浏览器支持** — `-b` 可指定 Chromium 系与 Firefox，支持按浏览器拆分 manifest。
- ⚛️ **框架无关** — 支持 Vue、React、Svelte、Solid 和原生 JS，兼容 TS/JS。
- 🤖 **AI 友好调试** — `--debug` 终端展示按入口聚合的错误信息。
- 🧪 **测试流程内置** — `addfox test` 转发参数到 Rstest，覆盖单测与 e2e 流程。
- 📊 **Rsdoctor 分析** — 在 dev/build 加 `--report` 可生成打包分析报告。
- 🧩 **Skills 集成** — 可通过脚手架或 `skills add` 使用 [addfox/skills](https://github.com/addfox/skills)。
- 🔐 **环境变量控制** — 加载 `.env`，通过 `envPrefix` 控制变量暴露范围。

## 安装与使用

**新项目：**

```bash
pnpm create addfox-app
# 或：npx create-addfox-app
```

按提示选择框架（Vanilla / Vue / React / Preact / Svelte / Solid）、语言、包管理工具、入口及可选 [Skills](https://github.com/addfox/skills)，会生成完整目录与 `addfox.config`。

**已有项目：**

```bash
pnpm add -D addfox
```

在项目根目录添加 `addfox.config.ts`（或 `.js` / `.mjs`），入口放在 `app/`（或配置 `appDir`）。然后：

- `addfox dev` — 开发模式，watch + 热更新
- `addfox build` — 构建到 `.addfox/extension`（可选打 zip）

使用 `-b chrome` 或 `-b firefox` 指定目标浏览器。

---

**完整文档、配置说明与示例：** [https://addfox.dev](https://addfox.dev)  
**Skills（AI 工作流模块）：** [https://github.com/addfox/skills](https://github.com/addfox/skills)
