# addfox 示例

本目录存放基于 addfox 的浏览器扩展示例，用于参考与本地调试。

| 示例 | 说明 |
|------|------|
| [addfox-with-vue](./addfox-with-vue) | Vue 3 模板：popup、options、content、background + 简单消息通信 |
| [addfox-with-react](./addfox-with-react) | React 模板：popup、options、content、background + 简单消息通信 |
| [addfox-with-preact](./addfox-with-preact) | Preact 模板：popup、options、content、background + 简单消息通信 |
| [addfox-with-svelte](./addfox-with-svelte) | Svelte 模板：popup、options、content、background + 简单消息通信 |
| [addfox-with-solid](./addfox-with-solid) | Solid 模板：popup、options、content、background + 简单消息通信 |
| [addfox-with-react-shadcn](./addfox-with-react-shadcn) | React + shadcn/ui：popup、options、content、background、sidepanel |
| [addfox-with-devtools](./addfox-with-devtools) | 纯原生 TS：background + devtools_page，无 React/Vue |
| [addfox-with-firefox](./addfox-with-firefox) | Firefox 模板：popup、content、background + 简单消息通信 |
| [addfox-with-content-ui](./addfox-with-content-ui) | **Content UI**：使用 `@addfox/utils` 的 `defineContentUI` / `mountContentUI` 在 content script 中注入 UI（支持 shadow/iframe） |
| [addfox-with-content-ui-react](./addfox-with-content-ui-react) | **Content UI + React + Tailwind**：content script 使用 defineContentUI/mountContentUI 挂载 React + Tailwind 面板 |
| [addfox-with-react-entry-false](./addfox-with-react-entry-false) | React 模板（entry 关闭）：popup、options、content、background |
| [addfox-with-rstest](./addfox-with-rstest) | **Rstest** 单元测试示例：在扩展项目中使用 rstest 进行单元测试 |
| [addfox-with-single-file](./addfox-with-single-file) | 单文件入口模板：popup.html、options.html、background.ts、content.ts |
| [addfox-with-newtab-override](./addfox-with-newtab-override) | 内置页面覆盖示例：`newtab` 入口，自动填充 `chrome_url_overrides.newtab` |
| [addfox-with-bookmarks-override](./addfox-with-bookmarks-override) | 内置页面覆盖示例：`bookmarks` 入口，自动填充 `chrome_url_overrides.bookmarks` |
| [addfox-with-history-override](./addfox-with-history-override) | 内置页面覆盖示例：`history` 入口，自动填充 `chrome_url_overrides.history`（并自动补 `permissions.history`） |
| [addfox-with-sandbox](./addfox-with-sandbox) | 内置沙盒页面示例：`sandbox` 入口，自动填充 `sandbox.pages` |
| [addfox-with-env-vars](./addfox-with-env-vars) | 环境变量注入示例：验证 `ADDFOX_PUBLIC_*` 会被打包，非 public 不会；并演示 `import.meta.env.BROWSER`/`MANIFEST_VERSION` |
| [addfox-with-wxt](./addfox-with-wxt) | **纯 WXT** 示例：使用 [WXT](https://wxt.dev/) 实现的扩展（不依赖 addfox），含 popup、options、content、background |

除 **addfox-with-wxt** 外，每个示例均有独立 `package.json` 与 `addfox.config.ts`，在对应目录执行 `pnpm install` 与 `pnpm dev` / `pnpm build` 即可。addfox-with-wxt 为纯 WXT 项目，使用 `wxt.config.ts`，同样在目录内执行 `pnpm install` 与 `pnpm dev` / `pnpm build`。

**当前 addfox 配置要点**：`addfox.config.ts` 使用 `defineConfig`；`manifest` 支持单对象或 chromium/firefox 分表；`plugins` 为 Rsbuild 插件数组（如 `[vue()]` / `[react()]`）；`entry` 可自定义入口路径；`rsbuild` 用于覆盖/合并 Rsbuild 配置；根目录 `public/` 由框架自动复制到构建产物，无需单独配置 copy。
