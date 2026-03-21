# React + shadcn/ui

基于 React 与 shadcn/ui 的扩展示例，包含 **popup、options、content、background、sidepanel** 五个入口。

**addfox.config 配置要点**

- `manifest`：仅写基础字段（name、version、permissions、action.default_icon）；popup、options、background、content_scripts、side_panel 由框架按**目录发现**自动注入。
- `appDir: "src"`：入口从 `src/` 下发现，对应目录为 `popup/`、`options/`、`content/`、`background/`、`sidepanel/`，每个目录需有 `index.html`（除 content、background）+ `index.tsx` 或 `index.ts`。
- `plugins: [react()]`：启用 React 与 JSX。
- `rsbuild.source.alias`：配置 `@` 指向 `src`，便于 `@/components/ui`、`@/lib/utils` 等引用。

**目录结构**

- `src/popup/`、`src/options/`、`src/sidepanel/`：各含 `index.html` + `index.tsx` + `App.tsx`，使用 shadcn 风格 Button、Card。
- `src/content/`：content script，`index.tsx` 注入 React 根并渲染小卡片，接收 popup 消息。
- `src/background/`：service worker，处理 PING 与 RELAY_TO_CONTENT。
- `src/components/ui/`：shadcn 风格组件（Button、Card）。
- `src/lib/utils.ts`：`cn()` 工具（clsx + tailwind-merge）。
- `src/index.css`：Tailwind 与 CSS 变量（shadcn 主题）。

**图标**

将 `icon_16.png`、`icon_48.png` 放入 `public/icons/`（可从 `addfox-with-react/public/icons/` 复制）。

在目录下执行 `pnpm install` 后 `pnpm dev` 或 `pnpm build`，在 Chrome 中加载 `dist`。右键扩展图标可打开 popup；扩展管理页可打开 Options 与 Side panel。
