---
title: '@addfox/cli'
---

# @addfox/cli

`addfox` 命令行的入口包：解析参数、执行 config → entry → Rsbuild 流水线、包装终端输出，并驱动 `dev` / `build`。

你可以编程式使用它来在 Addfox 之上构建自定义扩展工具。

## 安装

```bash
npm install @addfox/cli
```

## 功能

- 解析 `addfox dev | build | test [options]`
- 加载并解析 `addfox.config.ts`
- 自动发现或校验扩展入口
- 构建最终的 Rsbuild 配置
- 启动 dev server 或执行生产构建
- 可选：启动浏览器并加载扩展

## 命令

| 命令 | 说明 |
|---------|-------------|
| `dev` | 启动开发模式，支持热更新 |
| `build` | 执行生产构建 |
| `test` | 运行测试（参数透传给 rstest） |

## 常用参数

| 参数 | 说明 |
|--------|-------------|
| `-b, --browser <browser>` | 指定目标/启动浏览器 |
| `--port <port>` | Rsbuild dev server 端口（仅 dev，默认 `3000`） |
| `--no-open` | 不自动打开浏览器 |
| `--keep-browser-profile` | 跨启动保留浏览器 profile |
| `--no-keep-browser-profile` | 本次运行使用全新 profile |
| `-r, --report` | 启用 Rsdoctor 构建分析报告 |
| `--debug` | 启用调试模式 |

> `-c, --cache` 与 `--no-cache` 是 `--keep-browser-profile` / `--no-keep-browser-profile` 的废弃别名，仍可使用，但会打印 deprecated 警告。

## Dev server 与 HMR

`addfox dev` 使用 **Rsbuild dev server** 并开启 `writeToDisk: true`，让扩展可以从 `.addfox/<outDir>` 加载。`@addfox/rsbuild-plugin-extension-hmr` 插件会在构建输出变化时触发完整扩展重载，因此扩展可以同时工作在磁盘和 `chrome-extension://` 上下文中。

## 编程式使用

大多数用户直接调用 CLI 二进制文件。如果你需要在其他工具中嵌入 CLI，可以从 `@addfox/cli` 导入并调用与二进制文件相同的流水线函数。
