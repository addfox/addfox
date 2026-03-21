# addfox-with-manifest-entries

本示例演示**仅通过 manifest 声明所有内置入口**，不使用 `config.entry`。  
各 manifest 字段使用**源文件路径**（`.ts`），addfox 会解析并替换为构建产物路径。

## 包含的 manifest 内置入口

| 入口 | manifest 字段 | 说明 |
|------|----------------|------|
| background | `background.service_worker` | 后台脚本 |
| popup | `action.default_popup` | 弹出层 |
| options | `options_ui.page` | 选项页 |
| content | `content_scripts[].js` | 内容脚本 |
| devtools | `devtools_page` | 开发者工具页 |
| sidepanel | `side_panel.default_path` | 侧边栏 (MV3) |
| sandbox | `sandbox.pages` | 沙箱页 |
| newtab | `chrome_url_overrides.newtab` | 新标签页覆盖 |
| bookmarks | `chrome_url_overrides.bookmarks` | 书签页覆盖 |
| history | `chrome_url_overrides.history` | 历史记录页覆盖 |

## 运行

```bash
pnpm install
pnpm dev   # 开发
pnpm build # 构建
```

## 说明

- 未在 `addfox.config.ts` 中配置 `entry`，入口完全由 manifest 中的路径推断。
- 源路径需为 `.ts`/`.tsx`/`.js`/`.jsx`，构建后 manifest 中会被替换为对应产物路径（如 `popup/index.html`、`background/index.js`）。
