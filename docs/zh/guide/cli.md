---
title: CLI
---

# CLI

本页汇总 `addfox` CLI 支持的命令与参数。

## 基本用法

```bash
addfox <command> [options]
```

## 在 package.json 中配置 scripts

```json
{
  "scripts": {
    "dev": "addfox dev",
    "dev:firefox": "addfox dev -b firefox",
    "build": "addfox build",
    "build:chrome": "addfox build -b chrome",
    "test": "addfox test"
  }
}
```

## 命令

| 命令 | 说明 |
|------|------|
| `dev` | 启动开发模式（支持热更新）。 |
| `build` | 执行生产构建。 |
| `test` | 运行测试（参数会透传给 rstest）。 |

## 常用参数（默认值 + 配置映射）

| 参数 | 内置默认值 | 对应 `addfox.config` 字段 | 说明 |
|------|------------|---------------------------|------|
| `-b, --browser <browser>` | `chromium` | 无直接字段（影响目标与启动） | 指定目标/启动浏览器，详见下方[支持的浏览器列表](#支持的浏览器列表)。 |
| `--port <port>` | `3000` | 无直接字段 | Rsbuild dev server 端口，仅对 `dev` 生效。 |
| `-c, --cache` | `true` | `cache` | 启用浏览器 profile 缓存。 |
| `--no-cache` | `false`（仅当前命令） | `cache` | 禁用本次运行的浏览器 profile 缓存。 |
| `-r, --report` | `false` | `report` | 启用 Rsdoctor 构建分析报告。 |
| `--no-open` | `false`（即默认自动打开） | 无直接字段 | 构建或开发时不自动打开浏览器。 |
| `--debug` | `false` | `debug` | 启用调试模式（开发时错误监控等能力）。 |
| `--help` | - | - | 显示帮助。 |
| `--version` | - | - | 显示版本号。 |

## 支持的浏览器列表

`-b, --browser` 参数支持以下浏览器：

| 浏览器 | 说明 |
|--------|------|
| `chromium` | Chromium（默认） |
| `chrome` | Google Chrome |
| `edge` | Microsoft Edge |
| `brave` | Brave Browser |
| `vivaldi` | Vivaldi |
| `opera` | Opera |
| `santa` | Santa Browser |
| `arc` | Arc Browser |
| `yandex` | Yandex Browser |
| `browseros` | BrowserOS |
| `custom` | 自定义浏览器（需在配置中指定 `browser.custom`） |
| `firefox` | Mozilla Firefox |

## 示例

```bash
# Chromium 开发模式
addfox dev -b chromium

# 指定 dev server 端口
addfox dev --port 3100 -b edge

# Firefox 开发 + 调试
addfox dev -b firefox --debug

# 生产构建
addfox build -b chrome

# 构建但不自动打开浏览器
addfox build -b chrome --no-open

# 生成构建分析报告
addfox build -r
```

## 入口路径与 HTML 模板

传给 `entry` 的入口路径可以是**脚本**（`.ts/.tsx/.js/.jsx`）或 **HTML 模板**（`.html`）。

- **脚本路径**：框架以该脚本作为构建入口，并为需要 HTML 的入口自动生成页面。
- **HTML 路径**：入口路径可以写成 `popup/index.html`，但你必须告诉框架真正的入口脚本。方法有两种：
  - 在 HTML 中给 `<script type="module">` 标签加上 `data-addfox-entry`；
  - 在 HTML 旁边放置同名脚本文件（`index.ts` / `index.tsx`），让框架自动解析。

详情与示例见 [Config-based Entry](/guide/entry/config-based)。

## 说明

- `--debug` 主要作用于 `dev` 模式。
- `--no-cache` 适合做“干净环境”排查；`cache` 仍可在配置文件中作为项目默认值。
- `-b/--browser` 没有单独的 config 字段，属于命令级选择。
