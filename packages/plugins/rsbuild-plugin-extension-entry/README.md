# @addfox/rsbuild-plugin-extension-entry

[中文](README-zh_CN.md) | English

---

Rsbuild plugin: configures multi-entry, HTML templates and public copy from addfox’s resolved entry list. Injected by CLI pipeline; users do not configure it directly.

- Multi-entry: popup, options, content, background, sidepanel, devtools and custom entry
- HTML templates: JS/TS is the real entry; HTML is template only and must include one `<script data-addfox-entry src="...">`
- Entry config supports `string` or `{ src, html }` (html can be `true` or template path)
- Copies `public/` to dist when present
