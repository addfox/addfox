# AI usage (@addfox/utils)

## Purpose

Provides **content UI** helpers for extension content scripts: `defineContentUI` and `mountContentUI` to create and mount a root element into a page (with optional iframe or shadow DOM wrapper).

## When to use

- In **content scripts** that need to inject a UI root: `import { defineContentUI, mountContentUI } from "@addfox/utils"`, then call `mountContentUI(defineContentUI({ ... }))` when you want to mount.
- This package does **not** provide webextension-polyfill; users install it themselves if they need the `browser` API.

## Usage

```ts
import { defineContentUI, mountContentUI } from "@addfox/utils";
const spec = defineContentUI({ tag: "div", target: "body", wrapper: "shadow" });
const root = mountContentUI(spec);
root.appendChild(document.createElement("span"));
```

## When changing this package

- Content UI options: `tag`, `target`, `attr`, `injectMode`, `wrapper`. Keep the API stable.
