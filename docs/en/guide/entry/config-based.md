---
title: Config-based Entry
---

# Config-based Entry

When configuring with `entry` and `manifest` in `addfox.config.ts`, you can:
- Customize entry paths
- Override auto-discovery results
- Add **custom entries** (e.g., `capture`, `my-page`)

Entries not listed in `entry` will still be auto-discovered via [file-based rules](/guide/entry/file-based).

## Core Principles

Consistent with file-based entries:
- **Entries must be JS/TS**: Built on Rsbuild, real entries can only be script files
- **HTML handling**: Built-in HTML entries (popup/options, etc.) auto-generate; when using custom HTML templates, must mark entry script with `data-addfox-entry`
- **When HTML is auto-generated** (no custom template): the page includes **`<div id="root"></div>`**; **`<title>`** matches **`manifest.name`**; the **favicon** is a **`<link rel="icon">`** pointing at **`manifest.icons`**. With a custom `index.html`, those are **not** injected automatically—add `<title>` and icon links yourself.

## Configuration Methods

### 1) Configure via `entry`

`entry` is an object: **key = entry name, value = path or config object**.

### 2) Configure entry-related fields via `manifest`

In `manifest`, declare entry-related capability fields (e.g., `background`, `action.default_popup`, `content_scripts`):

```ts
export default defineConfig({
  manifest: {
    manifest_version: 3,
    background: { service_worker: "background/index.js" },
    action: { default_popup: "popup/index.html" },
    content_scripts: [
      { matches: ["<all_urls>"], js: ["content/index.js"] },
    ],
  },
});
```

### 3) Priority between `entry` and `manifest`

When both participate in entry resolution, the priority is:

1. Explicit configuration in `entry`
2. Entry-related fields in `manifest`
3. Auto-discovery (file-based)

That is: `entry` will override entries from other sources with the same name.

### String path (recommended)

Value is a path **relative to baseDir** (default `app/`):

| Value Type | Meaning | Example |
|------------|---------|---------|
| Script path `.ts/.tsx` | Use this script as entry; built-in HTML entries auto-generate HTML or use `index.html` in same directory as template | `"popup/index.ts"` |
| HTML path `.html` | Use this HTML as template; must resolve entry script via `data-addfox-entry` | `"popup/index.html"` |

### Object form: `{ src, html? }`

More fine-grained control:

| Field | Type | Description |
|-------|------|-------------|
| `src` | `string` | Entry script path (relative to baseDir) **required** |
| `html` | `boolean \| string` | `true`: generate HTML without template; `false`: script only; `string`: specify HTML template path |

## Built-in Entries and Output Paths

When configuring built-in entries via `entry`, default output paths are as follows:

| Entry Name | Type | Output Script | Output HTML |
|------------|------|---------------|-------------|
| `background` | Script only | `background/index.js` | — |
| `content` | Script only | `content/index.js` | — |
| `popup` | Script + HTML | `popup/index.js` | `popup/index.html` |
| `options` | Script + HTML | `options/index.js` | `options/index.html` |
| `sidepanel` | Script + HTML | `sidepanel/index.js` | `sidepanel/index.html` |
| `devtools` | Script + HTML | `devtools/index.js` | `devtools/index.html` |
| `offscreen` | Script + HTML | `offscreen/index.js` | `offscreen/index.html` |

:::info
In the manifest, the framework automatically fills `action.default_popup`, `options_page`, and other fields with the above paths.
:::

## Configuration Examples

### Override some entries

```ts
// addfox.config.ts
import { defineConfig } from "addfox";

export default defineConfig({
  entry: {
    // Only override these entries, others still auto-discovered
    popup: "popup/main.tsx",
    options: "options/settings.tsx",
  },
});
```

### Configure all entries completely

```ts
export default defineConfig({
  appDir: "src",
  entry: {
    background: "background/index.ts",
    content: "content/index.ts",
    popup: "popup/index.tsx",
    options: "options/index.tsx",
    sidepanel: "sidepanel/index.tsx",
  },
});
```

### Custom entry + force HTML generation

```ts
export default defineConfig({
  entry: {
    // Built-in entries
    background: "background/index.ts",
    content: "content/index.ts",
    popup: "popup/index.tsx",
    
    // Custom page entry (auto-generate HTML)
    capture: { src: "pages/capture/index.tsx", html: true },
    
    // Custom page entry (use template)
    welcome: { src: "pages/welcome/index.tsx", html: "pages/welcome/template.html" },
    
    // Script-only entry (no HTML)
    worker: { src: "worker/index.ts", html: false },
  },
});
```

### Disable entry auto-discovery

If you need full manual control of all entries:

```ts
export default defineConfig({
  entry: {
    background: "background/index.ts",
    content: "content/index.ts",
    popup: "popup/index.tsx",
    // ... list all required entries
  },
  // Keep other config items undefined, framework only processes entries listed in entry
});
```

## Path Resolution Rules

### Relative to baseDir

All paths in `entry` are **relative to baseDir**, where baseDir is determined by [`appDir`](/config/app-dir) (default `app`):

```ts
export default defineConfig({
  appDir: "src",                    // baseDir = src/
  entry: {
    popup: "popup/index.ts",        // points to src/popup/index.ts
  },
});
```

### Path Quick Reference

| Configuration | Entry Script Location | Typical Output |
|---------------|----------------------|----------------|
| `background: "background/index.ts"` | `app/background/index.ts` | `extension/background/index.js` |
| `content: "content.ts"` | `app/content.ts` | `extension/content.js` |
| `popup: "popup/index.ts"` | `app/popup/index.ts` | `extension/popup/index.html` + `extension/popup/index.js` |
| `capture: { src: "capture/index.ts", html: true }` | `app/capture/index.ts` | `extension/capture/index.html` + `extension/capture/index.js` |

## Next Steps

- [File-based Entry](/guide/entry/file-based) — Learn auto-discovery rules
- [appDir configuration](/config/app-dir) — Modify source directory
- [manifest configuration](/config/manifest) — Configure extension manifest
