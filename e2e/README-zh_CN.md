# E2E 测试 (Playwright)

对 addfox 构建出的浏览器扩展进行端到端测试，使用 Playwright 加载打包后的扩展并测试 popup/options、HMR、Monitor 等。

## 覆盖范围

- **extension.spec.ts**：popup/options 加载与交互
- **hmr.spec.ts**：plugin-extension-hmr 的 WebSocket 连接、热更新广播、getBrowserPath 与自定义浏览器路径
- **monitor.spec.ts**：plugin-extension-monitor 的 monitor 页面可打开（需带 monitor 的构建）

## 前置条件

- 已执行 `pnpm install`
- 完整 e2e 会先执行 `packages:build`、`e2e:build`、`e2e:build:monitor`，再跑测试

## 命令

- **`pnpm run e2e`**：构建包 + 构建 addfox-with-react + 以 debug 构建带 monitor 的扩展，再运行全部 E2E 测试（推荐）
- **`pnpm run e2e:ui`**：以 UI 模式运行测试
- **`pnpm run e2e:headed`**：有头浏览器运行测试
- **`pnpm run e2e:build`**：仅构建用于 E2E 的扩展（`examples/addfox-with-react`，无 monitor）
- **`pnpm run e2e:build:monitor`**：以 `ADDFOX_DEBUG=true` 启动 dev，等待 manifest 含 `open-addfox-monitor` 后退出，用于生成带 monitor 的 dist

## 扩展路径

默认使用 `examples/addfox-with-react/.addfox/dist`（由 `e2e:build` 生成）。  
可通过环境变量覆盖：

```bash
ADDFOX_E2E_EXTENSION_PATH=/path/to/unpacked/extension pnpx playwright test -c e2e
```

## 参考

- [Playwright - Chrome extensions](https://playwright.dev/docs/chrome-extensions)
