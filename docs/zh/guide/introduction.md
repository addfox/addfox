# 介绍

**Addfox** 是基于 [Rsbuild](https://rsbuild.dev) 的浏览器扩展开发框架，帮助你在同一套工程里开发、构建 Chrome 和 Firefox 扩展。

![Addfox 架构概览](/addfox-architecture.png)

## 为什么选择 Addfox

开发浏览器扩展本该简单——只需要 HTML、JavaScript、CSS 这些 Web 技术。但现实中，热更新、错误调试、前端框架集成等问题一直困扰着开发者。

Addfox 的目标是让扩展开发回归简单：

在 AI 时代，Addfox 更进一步，让 AI 能更好地理解和协助你的扩展开发：

- **AI 友好的项目结构** — 自动生成 `llms.txt`、`meta.md` 等结构化文档，让 AI 助手快速理解项目架构和配置
- **终端错误输出** — 开发时错误直接输出到终端，无需打开浏览器 DevTools，方便在任何编辑器中使用 Ask AI 功能
- **Skills 支持** — 内置可复用的 AI 技能库（如 migrate-to-addfox、addfox-debugging 等），让 AI 助手能更专业地协助开发和调试
- **最小化的代码约束** — 不强制特定的代码组织方式，AI 生成的代码可以无缝集成到项目中

无论你是开发者还是使用 AI 辅助开发，Addfox 都能提供更好的体验。

## 功能特性

### 为开发者

热更新、多浏览器支持与极简配置，助你更快交付扩展。

| 特性 | 说明 |
|------|------|
| **极速 HMR** | 使用独立 Reloader 控制扩展更新，content_script 和 background 均能实现极速 HMR |
| **全方位浏览器支持** | 支持主流 Chromium 系浏览器和 Firefox，无需配置即可自动识别浏览器默认安装地址并启动 |
| **框架无关** | 你可以用 Vanilla，也可以使用 Vue、React、Preact、Svelte、Solid 等框架 |
| **Content UI 支持** | 提供了内置的 createContentUI 方法，可轻松集成 Iframe、ShadowDom 和原生内容 |
| **Rstack 生态** | 内置支持 Rsdoctor 与 Rstest，可快速完成打包分析及单元、e2e 测试 |
| **支持 Zip 输出** | 构建时自动输出扩展 zip 包，便于安装与分发 |

### 为 AI

结构化 meta、终端错误输出与 Skills，让 AI 能理解并扩展你的扩展。

| 特性 | 说明 |
|------|------|
| **llms.txt 和 markdown 元信息** | 提供明确的插件信息、错误信息和 prompts，帮助 AI agent 开发 |
| **AI 友好的错误监控** | 使用 `--debug` 时启用终端错误输出，无需在浏览器操作即可掌握插件所有报错信息，方便你在任何 Editor 中直接 Ask AI |
| **Skills 支持** | 可扩展的 Skills，支持 Agent 与自动化 |

## 核心概念

Addfox 封装了扩展开发中的常见痛点：

- **入口自动发现** — 按约定放置文件即可，无需手动配置 entry
- **Manifest 智能处理** — 自动注入构建后的路径
- **开发时自动重载** — WebSocket 监听构建完成，自动刷新扩展

## 与其他方案对比

浏览器扩展开发生态因这些优秀框架而更加丰富。**WXT** 带来了 Vite 的强大性能和精心设计的插件系统，以及直观的约定式开发体验。**Plasmo** 提供了完善的云服务集成和开箱即用的出色开发体验。**Extension.js** 则以简洁易用著称，非常适合快速原型开发。每个框架都为降低扩展开发门槛做出了重要贡献。

Addfox 在借鉴这些优秀实践的同时，走出了自己的道路：

| 方案 | 构建工具 | 版本 | 开发体验 | 灵活性 |
|------|----------|------|----------|--------|
| 手写 Webpack/Vite | 自行配置 | - | 需手动处理 HMR | 完全可控 |
| Plasmo | Parcel | latest | 开箱即用 | 基于约定，含云服务 |
| WXT | Vite | ^0.20.18 | 开箱即用 | 基于约定，插件生态丰富 |
| Extension.js | Rspack | latest | 开箱即用 | 零配置，极简入门 |
| **Addfox** | **Rsbuild 1.7.5** | **0.1.1-beta.12** | **开箱即用** | **最小约定 + AI原生** |

**Addfox 的独特优势：**

- **Rsbuild 极致速度** — 相比 Vite/Parcel 方案，冷启动和热更新更快
- **AI 优先设计** — 内置 `llms.txt`、结构化错误输出和 Skills 支持，专为 AI 辅助开发打造
- **最大程度自由** — 不强制文件结构，没有自定义 API，使用你喜欢的代码组织方式
- **真正框架无关** — 无需包装组件或特殊适配器，与任何 UI 框架都能无缝协作

## 快速上手

```bash
# 使用脚手架创建项目
pnpm create addfox-app

# 进入项目目录
cd my-extension

# 启动开发服务器
pnpm dev
```

编辑 `app/popup/index.tsx` 文件，保存后扩展会自动重载。

## 下一步

- [安装指南](/guide/install) — 详细的项目创建步骤
- [目录结构](/guide/app-dir) — 了解项目组织方式
- [配置参考](/config/manifest) — 查看所有配置选项
