# DevTools Native TS

纯原生 TypeScript 的 Chrome DevTools 扩展示例：仅 background + devtools，无 React/Vue。

**配置关系**（在 `addfox.config.ts` 中一目了然）：

- `manifest.devtools_page: "devtools/index.html"` 即 devtools 入口的 HTML
- 该 HTML 就是 F12 里「Native TS」Tab 中展示的页面，无需再配置其它路径
- 入口由框架按目录发现：`src/devtools/index.html` + `index.ts` → 构建为 `dist/devtools/index.html` + `index.js`

- `src/background/index.ts`：background service worker
- `src/devtools/index.html` + `index.ts`：devtools 入口页（Tab 内容），使用 `chrome.devtools.panels.create` 与 `chrome.devtools.inspectedWindow` 等 API

在目录下执行 `pnpm install` 后 `pnpm dev` 或 `pnpm build`，在 Chrome 中加载 `dist`，打开任意页按 F12 即可看到「Native TS」Tab。
