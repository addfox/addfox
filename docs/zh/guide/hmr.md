# 热更新（HMR）

`addfox dev` 命令提供开发时的热更新体验：保存代码后自动重新构建，并通过 WebSocket 通知浏览器扩展重载。

## 工作机制

```
源代码变更
    ↓
Rsbuild Watch 重新构建
    ↓
构建完成 → WebSocket 通知
    ↓
浏览器扩展重载
    ↓
页面自动刷新
```

## 不同入口的热更新机制

### Background / Service Worker

Background 脚本采用**扩展重载**机制：

1. 代码变更 → Rsbuild 重新构建
2. 构建完成 → WebSocket 发送重载指令
3. 调用 `chrome.runtime.reload()` 重载整个扩展
4. Service Worker 重新启动，加载新代码

:::warning 状态丢失
Service Worker 重载后会丢失内存中的状态。如需持久化数据，请使用 `chrome.storage` API。
:::

### Content Script

Content Script 采用**重新注入**机制：

1. 代码变更 → Rsbuild 重新构建
2. 构建完成 → 扩展重载
3. Content Script 自动注入到匹配的页面
4. 已打开的标签页可选择自动刷新（见配置）

```ts
// addfox.config.ts
export default defineConfig({
  hotReload: {
    autoRefreshContentPage: true,  // content 变更时自动刷新页面，默认 true
  },
});
```

:::tip 与 Background 的区别
Content Script 运行在网页环境中，重载后会在匹配的页面重新注入，不需要手动刷新扩展管理页面。
:::

### Popup / Options / Sidepanel

页面类入口采用 **Rsbuild HMR** 机制：

1. 代码变更 → Rsbuild 尝试 HMR 热替换
2. 如果 HMR 成功 → 页面局部更新，状态保留
3. 如果 HMR 失败 → 自动回退到页面刷新

:::tip HMR 优势
- 更快的更新速度
- 保留组件状态（如表单输入）
- 更流畅的开发体验

:::

:::warning HTML 模板限制
受 Rsbuild 机制影响，HTML 模板文件（如 `popup/index.html`）不支持真正的 HMR 热替换。  
当你修改 HTML 模板时，Addfox 会回退到页面刷新或扩展重载。
:::

## Firefox 的特殊处理

Firefox 开发模式使用 **web-ext** 工具管理扩展：

- 扩展重载由 `web-ext` 处理，而非 Addfox 的 WebSocket
- 首次启动时会自动打开 Firefox 并加载扩展
- 支持自动重新加载（livereload）

:::info
使用 Firefox 开发时，确保已安装 Firefox 浏览器。Addfox 会自动调用 `web-ext` 处理 Firefox 的扩展加载和重载。
:::

## 使用方式

```bash
# 启动开发服务器（自动启用 HMR）
addfox dev

# 指定目标浏览器
addfox dev -b chrome
addfox dev -b firefox
```

## 首次启动流程

运行 `addfox dev` 后：

1. 首次构建完成
2. 根据配置自动启动浏览器
3. 加载开发中的扩展
4. 自动打开扩展的 popup/options 页面（如配置了 `open`）

## 配置选项

### 热重载端口

```ts
// addfox.config.ts
export default defineConfig({
  hotReload: {
    port: 23333,              // WebSocket 端口，默认 23333
    autoRefreshContentPage: true,  // content 变更时自动刷新页面，默认 true
  },
});
```

## 下一步

- [browserPath 配置](/guide/launch) — 配置开发时自动打开浏览器
- [monitor 调试](/guide/monitor) — 使用错误监控面板调试
- [config/hot-reload](/config/hot-reload) — 热重载的完整配置选项
