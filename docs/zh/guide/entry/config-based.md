# 基于配置的入口

在 `addfox.config.ts` 中通过 `entry` 与 `manifest` 做配置驱动时，可以：
- 自定义入口路径
- 覆盖自动发现的结果
- 添加**自定义入口**（如 `capture`、`my-page` 等）

未在 `entry` 中列出的入口仍会通过[基于文件的规则](/guide/entry/file-based)自动发现。

## 核心原则

与基于文件的入口一致：
- **入口必须是 JS/TS**：构建基于 Rsbuild，真实入口只能是脚本文件
- **HTML 的处理**：内置 HTML 入口（popup/options 等）自动生成；使用自定义 HTML 模板时，必须通过 `data-addfox-entry` 标明入口脚本

## 配置写法

### 1) 通过 `entry` 配置入口

`entry` 是一个对象：**键 = 入口名，值 = 路径或配置对象**。

### 2) 通过 `manifest` 配置入口相关字段

在 `manifest` 中可声明入口相关能力字段（如 `background`、`action.default_popup`、`content_scripts`）：

```ts
export default defineConfig({
  manifest: {
    manifest_version: 3,
    background: { service_worker: "background/index.js" },
    action: { default_popup: "popup/index.html" },
    content_scripts: [
      { matches: ["<all_urls>"], js: ["content/index.js"] },
    ],
  },
});
```

### 3) `entry` 与 `manifest` 的优先级

当两者同时参与入口解析时，优先级为：

1. `entry` 中显式配置
2. `manifest` 中入口相关字段
3. 自动发现（基于文件）

也就是：`entry` 会覆盖同名入口的其他来源。

### 字符串路径（推荐）

值为**相对于 baseDir**（默认 `app/`）的路径：

| 值类型 | 含义 | 示例 |
|--------|------|------|
| 脚本路径 `.ts/.tsx` | 以该脚本为入口；内置 HTML 入口会自动生成 HTML 或使用同目录的 `index.html` 作为模板 | `"popup/index.ts"` |
| HTML 路径 `.html` | 以该 HTML 为模板；必须通过 `data-addfox-entry` 解析入口脚本 | `"popup/index.html"` |

### 对象形式：`{ src, html? }`

更细粒度的控制：

| 字段 | 类型 | 说明 |
|------|------|------|
| `src` | `string` | 入口脚本路径（相对 baseDir）**必需** |
| `html` | `boolean \| string` | `true`：生成 HTML 无模板；`false`：仅脚本；`string`：指定 HTML 模板路径 |

## 内置入口与输出路径

通过 `entry` 配置内置入口时，默认输出路径如下：

| 入口名 | 类型 | 输出脚本 | 输出 HTML |
|--------|------|----------|-----------|
| `background` | 仅脚本 | `background/index.js` | — |
| `content` | 仅脚本 | `content/index.js` | — |
| `popup` | 脚本+HTML | `popup/index.js` | `popup/index.html` |
| `options` | 脚本+HTML | `options/index.js` | `options/index.html` |
| `sidepanel` | 脚本+HTML | `sidepanel/index.js` | `sidepanel/index.html` |
| `devtools` | 脚本+HTML | `devtools/index.js` | `devtools/index.html` |
| `offscreen` | 脚本+HTML | `offscreen/index.js` | `offscreen/index.html` |

:::info
在 manifest 中，框架会用上述路径自动填充 `action.default_popup`、`options_page` 等字段。
:::

## 配置示例

### 覆盖部分入口

```ts
// addfox.config.ts
import { defineConfig } from "addfox";

export default defineConfig({
  entry: {
    // 仅覆盖这些入口，其他仍自动发现
    popup: "popup/main.tsx",
    options: "options/settings.tsx",
  },
});
```

### 完整配置所有入口

```ts
export default defineConfig({
  appDir: "src",
  entry: {
    background: "background/index.ts",
    content: "content/index.ts",
    popup: "popup/index.tsx",
    options: "options/index.tsx",
    sidepanel: "sidepanel/index.tsx",
  },
});
```

### 自定义入口 + 强制生成 HTML

```ts
export default defineConfig({
  entry: {
    // 内置入口
    background: "background/index.ts",
    content: "content/index.ts",
    popup: "popup/index.tsx",
    
    // 自定义页面入口（自动生成 HTML）
    capture: { src: "pages/capture/index.tsx", html: true },
    
    // 自定义页面入口（使用模板）
    welcome: { src: "pages/welcome/index.tsx", html: "pages/welcome/template.html" },
    
    // 仅脚本入口（无 HTML）
    worker: { src: "worker/index.ts", html: false },
  },
});
```

### 禁用入口自动发现

如果需要完全手动控制所有入口：

```ts
export default defineConfig({
  entry: {
    background: "background/index.ts",
    content: "content/index.ts",
    popup: "popup/index.tsx",
    // ... 列出所有需要的入口
  },
  // 不要的配置项保持未定义，框架只会处理 entry 中列出的入口
});
```

## 路径解析规则

### 相对于 baseDir

`entry` 中所有路径均**相对于 baseDir**，baseDir 由 [`appDir`](/config/app-dir) 决定（默认 `app`）：

```ts
export default defineConfig({
  appDir: "src",                    // baseDir = src/
  entry: {
    popup: "popup/index.ts",        // 指向 src/popup/index.ts
  },
});
```

### 路径速查表

| 配置写法 | 入口脚本位置 | 典型输出 |
|----------|--------------|----------|
| `background: "background/index.ts"` | `app/background/index.ts` | `extension/background/index.js` |
| `content: "content.ts"` | `app/content.ts` | `extension/content.js` |
| `popup: "popup/index.ts"` | `app/popup/index.ts` | `extension/popup/index.html` + `extension/popup/index.js` |
| `capture: { src: "capture/index.ts", html: true }` | `app/capture/index.ts` | `extension/capture/index.html` + `extension/capture/index.js` |

## 下一步

- [基于文件的入口](/zh/guide/entry/file-based) — 了解自动发现规则
- [appDir 配置](/zh/config/app-dir) — 修改源代码目录
- [manifest 配置](/zh/config/manifest) — 配置扩展清单
