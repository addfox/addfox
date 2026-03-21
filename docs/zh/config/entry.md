# entry

`entry` 用于自定义扩展的入口映射。不配置时，框架会自动从应用目录发现入口。

## 概述

- **类型**：`Record<string, EntryConfigValue> | undefined`
- **默认值**：`undefined`（自动发现）
- **是否必需**：否

```ts
type EntryConfigValue = 
  | string                           // 脚本路径
  | { src: string; html?: boolean | string };  // 对象形式
```

## 保留入口名

以下名称有特殊含义，用于对应浏览器扩展的标准入口：

| 入口名 | 类型 | 说明 |
|--------|------|------|
| `background` | 仅脚本 | Service Worker / 后台脚本 |
| `content` | 仅脚本 | Content Script |
| `popup` | 脚本 + HTML | 弹窗页面 |
| `options` | 脚本 + HTML | 选项页 |
| `sidepanel` | 脚本 + HTML | 侧边栏 |
| `devtools` | 脚本 + HTML | 开发者工具页 |
| `offscreen` | 脚本 + HTML | Offscreen 文档 |

## 配置方式

### 字符串形式

值为相对于 baseDir（默认 `app/`）的脚本路径。

```ts
export default defineConfig({
  entry: {
    background: "background/index.ts",
    content: "content/index.ts",
    popup: "popup/index.tsx",
  },
});
```

### 对象形式

更细粒度的控制：

```ts
export default defineConfig({
  entry: {
    // 自动生成 HTML
    popup: { src: "popup/index.tsx", html: true },
    
    // 使用自定义 HTML 模板
    options: { src: "options/index.tsx", html: "options/template.html" },
    
    // 仅脚本（不生成 HTML）
    worker: { src: "worker/index.ts", html: false },
  },
});
```

### 自定义入口

除保留名外，可以添加任意名称作为自定义页面入口：

```ts
export default defineConfig({
  entry: {
    // 内置入口
    background: "background/index.ts",
    popup: "popup/index.tsx",
    
    // 自定义入口
    capture: { src: "pages/capture/index.tsx", html: true },
    welcome: { src: "pages/welcome/index.tsx", html: true },
  },
});
```

自定义入口会产出独立页面，可通过 `chrome-extension://<id>/capture/index.html` 访问。

## 路径规则

- 所有路径**相对于 baseDir**（由 [`appDir`](/config/app-dir) 决定，默认 `app/`）
- 入口必须是 `.js`、`.jsx`、`.ts`、`.tsx` 脚本
- 使用自定义 HTML 模板时，必须通过 `data-addfox-entry` 标明入口脚本

## 与自动发现的关系

- 配置了 `entry`：仅使用 `entry` 中声明的入口
- 未配置 `entry`：自动发现 `app/` 目录下的入口
- 混合使用：`entry` 中配置的入口会覆盖自动发现的同名入口

## 示例

### 覆盖部分入口

```ts
export default defineConfig({
  entry: {
    // 覆盖 popup 路径
    popup: "pages/popup/main.tsx",
    // background 和 content 仍自动发现
  },
});
```

### 完整配置

```ts
export default defineConfig({
  appDir: "src",
  entry: {
    background: "background/index.ts",
    content: "content/index.ts",
    popup: { src: "popup/index.tsx", html: true },
    options: { src: "options/index.tsx", html: "options/index.html" },
    capture: { src: "capture/index.tsx", html: true },
  },
});
```

## 相关配置

- [`appDir`](/config/app-dir) - 应用目录
- [guide/entry/concept](/guide/entry/concept) - 入口概念详解
- [guide/entry/file-based](/guide/entry/file-based) - 基于文件的入口发现
- [guide/entry/config-based](/guide/entry/config-based) - 基于配置的入口
