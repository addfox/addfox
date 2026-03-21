# @addfox/utils

[中文](README-zh_CN.md) | English

---

Utilities for extension content scripts: **content UI** helpers to define and mount a root element (optionally in iframe or shadow DOM) into a page.

- **Entry**: `@addfox/utils` — export `defineContentUI`, `mountContentUI`.

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

- **tag**: Element tag name (`"div"`, `"section"`, etc.).
- **target**: Mount target — CSS selector (for `document.querySelector`) or an `Element`.
- **attr**: Attributes for the element (`id`, `class`, `style`, `data-*`, etc.).
- **injectMode**: `"append"` (default) or `"prepend"`.
- **wrapper**: `"none"` (default), `"shadow"` (attach shadow root), or `"iframe"`.

If you need the `browser` API (e.g. `browser.runtime`), install [webextension-polyfill](https://github.com/mozilla/webextension-polyfill) yourself and import from it.
