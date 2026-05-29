<p align="center">
  <img width="200" src="https://raw.githubusercontent.com/addfox/addfox/main/addfox.png" alt="Addfox">
</p>

# @addfox/cli

[English](README.md) | 中文

---

addfox CLI 入口：解析 argv、运行流水线（加载配置 → 构建 Rsbuild 配置）、为输出加前缀并执行 Rsbuild 的 `dev` / `build`。

- 命令：`addfox dev`、`addfox build [-b chrome|edge|brave|vivaldi|opera|santa|firefox]`
- 依赖 `@addfox/core` 做配置与入口解析；依赖各插件提供 Rsbuild 逻辑

## Dev server 与 HMR（Tailwind / PostCSS）

`addfox dev` 使用 **rsbuild dev** (`rsbuild.startDevServer()`) 并开启 **writeToDisk**，让扩展可以从 **`.addfox/<outDir>`**（例如 `.addfox/dist`）加载。扩展从磁盘运行，且运行在 `chrome-extension://` 或页面 origin 中；Rsbuild 默认的 HMR WebSocket 客户端在这些上下文中无法连接。因此，**plugin-extension-hmr** 负责在构建输出变化时重新加载扩展，而 content/background 入口会注入 HMR-noop 代码以防止 WebSocket 连接错误。

### dev 配置

| 选项 | 位置 | 作用 |
|--------|--------|----------------|
| **dev + writeToDisk** | [src/pipeline.ts](src/pipeline.ts) – `buildHmrOverrides` | 设置 `dev.writeToDisk: true`，将所有构建输出写入磁盘供扩展加载。当 `hotReload` 启用时，还会设置 `hmr: true` 和 `liveReload: true`，使 rsbuild 在源码变化时重新编译。 |
| **Extension reload** | 同文件 – `tools.rspack` | 注入 plugin-extension-hmr，在构建输出变化时重新加载扩展。 |
| **Watch ignore output** | [@addfox/rsbuild-plugin-extension-entry](../plugins/rsbuild-plugin-extension-entry/src/index.ts) – `onBeforeCreateCompiler` | 将构建输出路径（`distPath` = `.addfox/<outDir>`）和 glob 模式 `"**/.addfox/**"` 加入 Rspack 的 `watchOptions.ignored`，避免输出目录的文件变化触发重新构建。 |

### 为什么 watch ignore 很重要

- **Tailwind / PostCSS**: PostCSS（如 `@tailwindcss/postcss`）会扩展 CSS 依赖图；在 watch 模式下，更多文件变化意味着更多增量构建。
- **构建输出**: `writeToDisk: true` 将所有构建输出（包括 HMR 激活时的 `.hot-update.*` 文件）写入 `.addfox/<outDir>`。如果没有 `watchOptions.ignored`，watcher 会检测到输出目录的变化并触发重新构建，导致无限循环。
- **忽略策略**: `watchOptions.ignored` 同时添加输出根目录的绝对路径和 glob 模式 `"**/.addfox/**"`，确保输出目录在所有平台上都被排除在监听之外。

### 如果仍然看到重建循环

请确保你使用的是包含上述修复的较新 addfox 版本。除了正常的 `postcss.config.mjs` 和 Tailwind 配置外，不需要额外的项目端配置。
