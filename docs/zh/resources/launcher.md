---
title: '@addfox/launcher'
---

# @addfox/launcher

用于扩展开发的浏览器启动器，支持 Chromium 系（Chrome、Edge、Brave 等）和 Gecko 系（Firefox、Zen、LibreWolf 等）浏览器。

## 安装

```bash
npm install @addfox/launcher
```

## CLI 用法

```bash
npx addfox-launcher <browser> [url] [options]
```

### 支持的浏览器

- **Chromium 系**：`chrome`、`chromium`、`edge`、`brave`、`vivaldi`、`opera`、`santa`、`arc`、`yandex`、`browseros`、`custom`
- **Gecko 系**：`firefox`、`zen`、`librewolf`、`waterfox`、`floorp`

### 选项

| 选项 | 说明 |
|--------|-------------|
| `--binary <path>` | 浏览器可执行文件路径 |
| `--extension <path>` | 要加载的扩展目录（可重复） |
| `--profile <path>` | 用户 profile / 数据目录 |
| `--watch <path>` | 监听目录变化并重启（可重复） |
| `--devtools` | 自动打开 DevTools |
| `--remote-debugging-port <port>` | 启用远程调试 |
| `--args "<flags>"` | 额外的浏览器启动参数 |
| `--verbose, -v` | 详细日志 |
| `--help, -h` | 显示帮助 |

### 示例

```bash
# 用 Chrome 启动并加载扩展
npx addfox-launcher chrome --extension ./dist

# 用 Firefox 启动，加载扩展并监听文件变化
npx addfox-launcher firefox --extension ./dist --watch ./src --verbose
```

## 编程式 API

```ts
import { launchBrowser } from "@addfox/launcher";

const browser = await launchBrowser({
  target: "chrome",
  extensionPaths: ["./dist"],
  devtools: true,
});

// 退出
await browser.exit();
```

### 子路径导出

```ts
// Chromium 专用 API
import { launchChromium } from "@addfox/launcher/chromium";

// Gecko 专用 API
import { launchGecko, createGeckoProfile, reinstallTemporaryAddonViaRDP } from "@addfox/launcher/gecko";
```
