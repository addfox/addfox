# manifest

`manifest` 用于声明浏览器扩展的清单（Manifest），即最终输出目录中的 `manifest.json` 内容。

## 概述

- **类型**：`ManifestConfig | ManifestPathConfig | undefined`
- **默认值**：`undefined`（自动加载）
- **是否必需**：否

## 配置方式

### 1. 内联对象（单浏览器）

最简单的配置方式，适合只支持一个浏览器或两个浏览器配置相同的情况。

```ts
// addfox.config.ts
import { defineConfig } from "addfox";

export default defineConfig({
  manifest: {
    name: "我的扩展",
    version: "1.0.0",
    manifest_version: 3,
    permissions: ["storage", "activeTab"],
    action: { default_popup: "popup/index.html" },
    background: { service_worker: "background/index.js" },
    content_scripts: [
      { matches: ["<all_urls>"], js: ["content/index.js"] },
    ],
  },
});
```

### 2. 按浏览器拆分（chromium / firefox）

当 Chrome 和 Firefox 需要不同配置时使用。

```ts
// addfox.config.ts
export default defineConfig({
  manifest: {
    chromium: {
      name: "我的扩展",
      version: "1.0.0",
      manifest_version: 3,
      action: { default_popup: "popup/index.html" },
      background: { service_worker: "background/index.js" },
    },
    
    firefox: {
      name: "我的扩展",
      version: "1.0.0",
      manifest_version: 3,
      action: { default_popup: "popup/index.html" },
      background: { service_worker: "background/index.js" },
    },
  },
});
```

### 3. 文件路径配置

将 manifest 保存在独立的 JSON 文件中。

```ts
// addfox.config.ts
export default defineConfig({
  manifest: {
    chromium: "manifest/manifest.chromium.json",
    firefox: "manifest/manifest.firefox.json",
  },
});
```

路径相对于 [`appDir`](/config/app-dir)。

### 4. 自动加载（推荐）

不写 `manifest` 配置时，框架会自动查找：

1. `appDir/manifest.json`, `appDir/manifest.chromium.json`, `appDir/manifest.firefox.json`
2. `appDir/manifest/manifest.json`, `appDir/manifest/manifest.chromium.json`, `appDir/manifest/manifest.firefox.json`

任何找到的文件都将用作基础，并与同一目录中的 chromium/firefox 文件合并。
## 在 Manifest 中直接指定入口源文件

从 addfox 1.x 开始，你可以在 manifest 中直接指定入口的**源文件路径**，框架会自动识别并构建，然后将路径替换为产物路径。

```ts
// addfox.config.ts
export default defineConfig({
  manifest: {
    name: "我的扩展",
    version: "1.0.0",
    manifest_version: 3,
    
    // 直接在 manifest 中写源文件路径
    background: {
      service_worker: "./background/index.ts",  // 源文件路径
    },
    action: {
      default_popup: "./popup/index.tsx",       // 源文件路径
    },
    content_scripts: [
      {
        matches: ["<all_urls>"],
        js: ["./content/index.ts"],              // 源文件路径
      },
    ],
  },
});
```

框架会：
1. 识别这些源文件路径（`.ts`、`.tsx`、`.js`、`.jsx`）
2. 自动将它们作为 entry 处理
3. 构建后将路径替换为产物路径（如 `background/index.js`）

### 支持的入口字段

你可以在以下 manifest 字段中使用源文件路径：

| 字段 | 说明 |
|------|------|
| `background.service_worker` | MV3 后台脚本 |
| `background.scripts` | MV2 后台脚本 |
| `background.page` | 后台页面 |
| `action.default_popup` | MV3 弹窗页面 |
| `browser_action.default_popup` | MV2 弹窗页面 |
| `options_ui.page` / `options_page` | 选项页 |
| `devtools_page` | 开发者工具页 |
| `side_panel.default_path` | 侧边栏 |
| `sandbox.pages` | 沙箱页面 |
| `chrome_url_overrides.newtab` | 新标签页 |
| `chrome_url_overrides.bookmarks` | 书签页 |
| `chrome_url_overrides.history` | 历史页 |
| `content_scripts[].js` | 内容脚本 |

### 入口解析优先级

框架解析入口的优先级如下：

1. **最高**：`config.entry` 中显式配置的入口
2. **第二**：manifest 中指定的源文件路径
3. **第三**：自动发现（基于文件约定）

这意味着：
- 如果你在 `config.entry` 中指定了入口，manifest 中的源文件路径会被忽略
- 如果你没有配置 `config.entry`，但 manifest 中有源文件路径，框架会使用 manifest 中的路径
- 如果都没有，框架会按约定自动发现入口

```ts
// 示例：config.entry 优先级最高
export default defineConfig({
  entry: {
    // 这个配置会覆盖 manifest 中的 background 源文件路径
    background: "custom-background/index.ts",
  },
  manifest: {
    background: {
      service_worker: "./background/index.ts",  // 会被 config.entry 覆盖
    },
  },
});
```

## 类型定义

```ts
type ManifestConfig = 
  | Record<string, unknown>           // 单一对象
  | { chromium?: Record<string, unknown>; firefox?: Record<string, unknown> };  // 拆分

type ManifestPathConfig = {
  chromium?: string;   // 相对于 appDir 的路径
  firefox?: string;    // 相对于 appDir 的路径
};
```

## 注意事项

1. 入口路径（如 `popup/index.html`）由框架根据 [`entry`](/config/entry) 和 [`outDir`](/config/out-dir) 自动计算
2. 使用 CLI `-b chrome|firefox` 选择对应分支进行构建
3. 框架会自动注入 `background`、`content_scripts`、`action` 等入口路径到 manifest
4. 当在 manifest 中使用源文件路径时，确保文件存在，否则构建会失败

## 示例

### 双浏览器支持

```ts
export default defineConfig({
  manifest: {
    chromium: {
      name: "标签页管理器",
      version: "1.0.0",
      manifest_version: 3,
      permissions: ["tabs", "storage"],
      action: { default_popup: "popup/index.html" },
      background: { service_worker: "background/index.js" },
      content_scripts: [
        { matches: ["<all_urls>"], js: ["content/index.js"] },
      ],
    },
    
    firefox: {
      name: "标签页管理器",
      version: "1.0.0",
      manifest_version: 3,
      permissions: ["tabs", "storage"],
      action: { default_popup: "popup/index.html" },
      background: { service_worker: "background/index.js" },
      content_scripts: [
        { matches: ["<all_urls>"], js: ["content/index.js"] },
      ],
    },
  },
});
```

### 纯 Manifest 入口配置（无 config.entry）

```ts
export default defineConfig({
  // 不配置 entry，完全依赖 manifest 中的源文件路径
  manifest: {
    name: "纯Manifest配置示例",
    version: "1.0.0",
    manifest_version: 3,
    background: {
      service_worker: "./src/background.ts",
    },
    action: {
      default_popup: "./src/popup.tsx",
    },
    content_scripts: [
      {
        matches: ["<all_urls>"],
        js: ["./src/content.ts"],
      },
    ],
  },
});
```

## 相关配置

- [`entry`](/config/entry) - 入口配置
- [`appDir`](/config/app-dir) - 应用目录
- [`outDir`](/config/out-dir) - 输出目录
