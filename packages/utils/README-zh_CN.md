<p align="center">
  <img width="200" src="https://raw.githubusercontent.com/addfox/addfox/main/addfox.png" alt="Addfox">
</p>

# @addfox/utils

[English](README.md) | 中文

---

扩展内容脚本工具：**content UI**，用于在页面中定义并挂载根元素（可选 iframe 或 shadow DOM）。

- **入口**：`@addfox/utils`，导出 `defineContentUI`、`mountContentUI`。

## Content UI

```ts
import { defineContentUI, mountContentUI } from "@addfox/utils";

const spec = defineContentUI({
  tag: "div",
  target: "body",
  attr: { id: "my-root", class: "container" },
  injectMode: "append",
  wrapper: "shadow",
});
const root = mountContentUI(spec);
root.appendChild(myContent);
```

- **tag**：元素标签名（如 `"div"`、`"section"`）。
- **target**：挂载目标，支持 `document.querySelector` 的选择器字符串或 `Element`。
- **attr**：元素属性（`id`、`class`、`style`、`data-*` 等）。
- **injectMode**：`"append"`（默认）或 `"prepend"`。
- **wrapper**：`"none"`（默认）、`"shadow"`（Shadow DOM）或 `"iframe"`。

如需 `browser` API（如 `browser.runtime`），请自行安装 [webextension-polyfill](https://github.com/mozilla/webextension-polyfill) 并从该包导入。
