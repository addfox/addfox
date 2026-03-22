# 入口概念

**入口（Entry）** 对应浏览器扩展的各个功能模块，如后台脚本、内容脚本、弹窗页面等。Addfox 提供三种配置方式，你可以单独使用或混合使用。

## 什么是入口

浏览器扩展由多个独立的功能模块组成，每个模块都需要一个入口文件：

| 入口类型 | 对应浏览器扩展概念 | 典型用途 |
|----------|-------------------|----------|
| `background` | Service Worker / 后台脚本 | 处理扩展生命周期、跨页面通信 |
| `content` | Content Script | 操作网页 DOM、与页面交互 |
| `popup` | 弹窗页面 | 工具栏图标点击后的弹出界面 |
| `options` | 选项页 | 扩展的设置界面 |
| `sidepanel` | 侧边栏 | Chrome 侧边面板 |
| `devtools` | 开发者工具 | 自定义 DevTools 面板 |
| `offscreen` | Offscreen 文档 | 需要 DOM API 的后台任务 |

## 配置方式

### 方式一：基于文件（推荐）

**不配置 `entry`**，由框架按目录和文件名自动发现入口。

```tree
app/
├── background/
│   └── index.ts      # → background 入口
├── content/
│   └── index.ts      # → content 入口
├── popup/
│   └── index.ts      # → popup 入口
└── ...
```

优点：
- 零配置，遵循约定即可
- 新增入口只需创建对应目录
- 代码结构清晰

详见 [基于文件的入口](/guide/entry/file-based)。

### 方式二：基于配置（entry + manifest）

在 `addfox.config.ts` 中通过 `entry` 与 `manifest` 共同配置入口相关能力：

```ts
export default defineConfig({
  entry: {
    background: "background/index.ts",
    content: "content/index.ts",
    popup: "popup/index.ts",
  },
  manifest: {
    manifest_version: 3,
    action: { default_popup: "popup/index.html" },
  },
});
```

优点：
- 入口与清单配置集中管理
- 支持自定义入口名称
- 可覆盖自动发现结果

详见 [基于配置的入口](/zh/guide/entry/config-based) 与 [manifest 配置](/zh/config/manifest)。

### 混合使用

三种方式可以混合使用，优先级如下：

1. **最高**：`config.entry` 中配置的入口
2. **第二**：manifest 中指定的源文件路径
3. **第三**：自动发现

```ts
export default defineConfig({
  entry: {
    // 最高优先级：覆盖其他所有配置
    popup: "pages/popup/main.ts",
  },
  manifest: {
    // 第二优先级：当 entry 没有指定时使用
    background: { service_worker: "./background/index.ts" },
    // popup 会使用 entry 中的配置，而不是这里的
    action: { default_popup: "./popup/index.ts" },
  },
  // 第三优先级：自动发现未配置的入口
});
```

## 核心原则

### 入口必须是 JS/TS

Addfox 基于 **Rsbuild** 构建，真实的构建入口只能是 `.js`、`.jsx`、`.ts`、`.tsx` 脚本文件。

### HTML 的处理

- **无需 HTML 的入口**：`background`、`content` 只需脚本文件
- **需要 HTML 的入口**：`popup`、`options`、`sidepanel`、`devtools`、`offscreen`
  - 若不提供 HTML，Rsbuild 会自动生成（包含 `<div id="root"></div>`）
  - 若提供自定义 HTML 模板，必须在模板中通过 `data-addfox-entry` 标明入口脚本

### 示例：自定义 HTML 模板

```html
<!-- app/popup/index.html -->
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>弹窗</title>
  </head>
  <body>
    <div id="root"></div>
    <!-- 通过 data-addfox-entry 标明入口 -->
    <script type="module" data-addfox-entry src="./index.ts"></script>
  </body>
</html>
```

## 内置入口与自定义入口

### 内置入口（保留名称）

以下名称具有特殊含义，Addfox 会自动识别并处理：

| 入口名 | 说明 |
|--------|------|
| `background` | Service Worker（MV3）或后台页面（MV2） |
| `content` | 内容脚本 |
| `popup` | 工具栏弹窗 |
| `options` | 扩展选项页 |
| `sidepanel` | 侧边栏 |
| `devtools` | 开发者工具 |
| `offscreen` | Offscreen 文档 |

:::warning
内置入口名称不可修改。框架依赖这些名称进行自动识别和 manifest 路径填充。
:::

### 自定义入口

除内置入口外，你可以在 `entry` 中配置任意名称作为**自定义入口**（如 `capture`、`my-page`）：

```ts
export default defineConfig({
  entry: {
    capture: { src: "capture/index.ts", html: true },
  },
});
```

自定义入口会产出独立的页面，可通过 `chrome-extension://<id>/capture/index.html` 访问。

## 下一步

- [基于文件的入口](/zh/guide/entry/file-based) — 学习约定式入口发现规则
- [基于配置的入口](/zh/guide/entry/config-based) — 了解如何显式配置 entry + manifest
- [manifest 配置](/zh/config/manifest) — 在 manifest 中配置扩展能力
