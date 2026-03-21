# Manifest 配置

`manifest` 用于声明浏览器扩展的清单（Manifest），即最终输出目录中的 `manifest.json` 内容。

支持三种配置方式：
- **内联对象**：直接在配置中写 manifest 内容
- **按浏览器拆分**：分别配置 Chrome 和 Firefox 的 manifest
- **文件路径**：指定 manifest 文件的位置

也可以**完全省略**，由框架从源代码目录自动加载。

## 类型与默认行为

- **类型**：`ManifestConfig | ManifestPathConfig | undefined`
- **默认行为**：不配置时，框架会从 `appDir` 或其子目录 `manifest/` 自动查找：
  - `manifest.json` — 基础配置（单浏览器或公共部分）
  - `manifest.chromium.json` — Chrome 覆盖配置
  - `manifest.firefox.json` — Firefox 覆盖配置

构建时，框架会根据 CLI 指定的目标浏览器（`-b chrome|firefox`）进行合并，输出到 `outputRoot/outDir/manifest.json`。

## 配置方式

### 1. 单一对象（单浏览器或公共配置）

所有字段写在一个对象里，框架会自动注入入口路径。

```ts
// addfox.config.ts
import { defineConfig } from "addfox";

export default defineConfig({
  manifest: {
    name: "我的扩展",
    version: "1.0.0",
    manifest_version: 3,
    permissions: ["storage", "activeTab"],
  },
});
```

框架会根据入口配置自动生成并注入路径：
- `action.default_popup` → `popup/index.html`
- `background.service_worker` → `background/index.js`
- `content_scripts` → `content/index.js`

> 入口路径（如 `popup/index.html`）由框架根据 [entry](/zh/guide/entry/file-based) 和 [outDir](/zh/config/out-dir) 自动计算，你只需保持 manifest 中的字段语义正确。

### 2. 按浏览器拆分（chromium / firefox）

当 Chrome 和 Firefox 需要不同的 manifest 配置时：

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
      permissions: ["storage"],
    },
    firefox: {
      name: "我的扩展",
      version: "1.0.0",
      manifest_version: 3,
      action: { default_popup: "popup/index.html" },
      background: { service_worker: "background/index.js" },
      permissions: ["storage"],
    },
  },
});
```

构建时会根据 CLI 参数选择对应分支：
- `addfox dev -b chrome` → 使用 `chromium` 分支
- `addfox dev -b firefox` → 使用 `firefox` 分支

### 3. 路径配置（相对于 appDir）

将 manifest 保存在独立的 JSON 文件中：

```ts
// addfox.config.ts
export default defineConfig({
  manifest: {
    chromium: "manifest/manifest.chromium.json",
    firefox: "manifest/manifest.firefox.json",
  },
});
```

文件路径相对于 [`appDir`](/zh/config/app-dir)。

### 4. 完全省略（自动加载）

不写 `manifest` 配置时，框架会按以下顺序查找：

1. `appDir/manifest.json`
2. `appDir/manifest/manifest.json`
3. `appDir/manifest/manifest.chromium.json`
4. `appDir/manifest/manifest.firefox.json`

**推荐的文件结构**：

```
app/
├── manifest/
│   ├── manifest.json           # 基础配置
│   ├── manifest.chromium.json  # Chrome 覆盖
│   └── manifest.firefox.json   # Firefox 覆盖
├── background/
├── content/
└── popup/
```

## 完整示例

### 支持双浏览器的配置

```ts
// addfox.config.ts
import { defineConfig } from "addfox";

export default defineConfig({
  manifest: {
    chromium: {
      name: "标签页管理器",
      version: "1.0.0",
      description: "高效管理浏览器标签页",
      manifest_version: 3,
      permissions: ["tabs", "storage"],
      icons: {
        16: "icons/icon16.png",
        48: "icons/icon48.png",
        128: "icons/icon128.png",
      },
      action: {
        default_popup: "popup/index.html",
        default_icon: {
          16: "icons/icon16.png",
        },
      },
      background: {
        service_worker: "background/index.js",
      },
      content_scripts: [
        {
          matches: ["<all_urls>"],
          js: ["content/index.js"],
          run_at: "document_end",
        },
      ],
    },
    
    firefox: {
      name: "标签页管理器",
      version: "1.0.0",
      description: "高效管理浏览器标签页",
      manifest_version: 3,
      permissions: ["tabs", "storage"],
      icons: {
        16: "icons/icon16.png",
        48: "icons/icon48.png",
        128: "icons/icon128.png",
      },
      action: {
        default_popup: "popup/index.html",
        default_icon: {
          16: "icons/icon16.png",
        },
      },
      background: {
        service_worker: "background/index.js",
      },
      content_scripts: [
        {
          matches: ["<all_urls>"],
          js: ["content/index.js"],
          run_at: "document_end",
        },
      ],
    },
  },
});
```

## 相关配置

- [entry](/zh/guide/entry/file-based) — 入口发现规则
- [appDir](/zh/config/app-dir) — 应用目录配置
- [outDir](/zh/config/out-dir) — 输出目录配置
