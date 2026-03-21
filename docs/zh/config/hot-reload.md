# hotReload

`hotReload` 用于配置开发时的热重载行为。

## 概述

- **类型**：`{ port?: number; autoRefreshContentPage?: boolean }`
- **默认值**：`{ port: 23333, autoRefreshContentPage: true }`
- **是否必需**：否

## 用法

```ts
// addfox.config.ts
import { defineConfig } from "addfox";

export default defineConfig({
  hotReload: {
    port: 23333,                    // WebSocket 端口
    autoRefreshContentPage: false,   // content 变更时自动刷新页面
  },
});
```

## 配置项

### port

- **类型**：`number`
- **默认值**：`23333`
- **说明**：WebSocket 服务器端口，用于开发时与扩展通信

```ts
export default defineConfig({
  hotReload: {
    port: 3000,  // 使用 3000 端口
  },
});
```

### autoRefreshContentPage

- **类型**：`boolean`
- **默认值**：`true`
- **说明**：content script 变更后是否自动刷新当前标签页

```ts
export default defineConfig({
  hotReload: {
    autoRefreshContentPage: false,  // 不自动刷新页面
  },
});
```

## 工作原理

1. `addfox dev` 启动 WebSocket 服务器（默认端口 23333）
2. 扩展通过 WebSocket 与服务器建立连接
3. 代码变更 → 重新构建 → WebSocket 发送重载指令
4. 扩展自动 reload，页面刷新

:::tip Background 与 Content 的区别
- **Background** 变更：整个扩展重载，Service Worker 重启
- **Content** 变更：扩展重载 + 重新注入到页面
:::

## 相关配置

- [guide/hmr](/guide/hmr) - 热更新指南
