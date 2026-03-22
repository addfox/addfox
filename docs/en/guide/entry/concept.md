---
title: Entry Concepts
---

# Entry Concepts

**Entries** correspond to the functional modules of browser extensions, such as background scripts, content scripts, popup pages, etc. Addfox provides three configuration methods that can be used individually or in combination.

## What are Entries

Browser extensions consist of multiple independent functional modules, each requiring an entry file:

| Entry Type | Browser Extension Concept | Typical Use |
|------------|---------------------------|-------------|
| `background` | Service Worker / Background script | Handle extension lifecycle, cross-page communication |
| `content` | Content Script | Manipulate webpage DOM, interact with pages |
| `popup` | Popup page | Interface that appears after clicking toolbar icon |
| `options` | Options page | Extension settings interface |
| `sidepanel` | Side panel | Chrome side panel |
| `devtools` | Developer tools | Custom DevTools panel |
| `offscreen` | Offscreen document | Background tasks requiring DOM API |

For entries that need HTML (**`popup`**, **`options`**, **`sidepanel`**, **`devtools`**, **`offscreen`**): if you **do not** provide a custom `index.html`, the build **auto-generates** the page with **`<div id="root"></div>`**, **`<title>`** from **`manifest.name`**, and a **favicon** via **`<link rel="icon">`** from **`manifest.icons`**. With a custom HTML template, you supply title, icon links, and the mount node yourself (see [File-based Entry](/guide/entry/file-based)).

## Configuration Methods

### Method 1: File-based (Recommended)

**Do not configure `entry`**, let the framework discover entries automatically by directory and file name.

```tree
app/
├── background/
│   └── index.ts      # → background entry
├── content/
│   └── index.ts      # → content entry
├── popup/
│   └── index.ts      # → popup entry
└── ...
```

Advantages:
- Zero configuration, follow conventions
- Add new entries by simply creating directories
- Clear code structure

See [File-based Entry](/guide/entry/file-based).

### Method 2: Config-based (entry + manifest)

Configure entry-related capabilities through `entry` and `manifest` in `addfox.config.ts`:

```ts
export default defineConfig({
  entry: {
    background: "background/index.ts",
    content: "content/index.ts",
    popup: "popup/index.ts",
  },
  manifest: {
    manifest_version: 3,
    action: { default_popup: "popup/index.html" },
  },
});
```

Advantages:
- Centralized entry and manifest configuration
- Support custom entry names
- Can override auto-discovery results

See [Config-based Entry](/guide/entry/config-based) and [manifest configuration](/config/manifest).

### Hybrid Usage

These three methods can be used in combination with the following priority:

1. **Highest**: `entry` in config
2. **Second**: Source file paths in manifest
3. **Third**: Auto-discovery

```ts
export default defineConfig({
  entry: {
    // Highest priority: overrides all other configurations
    popup: "pages/popup/main.ts",
  },
  manifest: {
    // Second priority: used when entry is not specified
    background: { service_worker: "./background/index.ts" },
    // popup will use entry config, not this
    action: { default_popup: "./popup/index.ts" },
  },
  // Third priority: auto-discover unconfigured entries
});
```

## Core Principles

### Entries must be JS/TS

Addfox is built on **Rsbuild**, and the real build entries can only be `.js`, `.jsx`, `.ts`, `.tsx` script files.

### HTML Handling

- **Entries without HTML**: `background`, `content` only need script files
- **Entries with HTML**: `popup`, `options`, `sidepanel`, `devtools`, `offscreen`
  - If no HTML is provided, Rsbuild will auto-generate (containing `<div id="root"></div>`)
  - If providing custom HTML template, must mark entry script with `data-addfox-entry`

### Example: Custom HTML Template

```html
<!-- app/popup/index.html -->
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>Popup</title>
  </head>
  <body>
    <div id="root"></div>
    <!-- Mark entry with data-addfox-entry -->
    <script type="module" data-addfox-entry src="./index.ts"></script>
  </body>
</html>
```

## Built-in and Custom Entries

### Built-in Entries (Reserved Names)

The following names have special meanings and are automatically recognized by Addfox:

| Entry Name | Description |
|------------|-------------|
| `background` | Service Worker (MV3) or background page (MV2) |
| `content` | Content script |
| `popup` | Toolbar popup |
| `options` | Extension options page |
| `sidepanel` | Side panel |
| `devtools` | Developer tools |
| `offscreen` | Offscreen document |

:::warning
Built-in entry names cannot be changed. The framework relies on these names for automatic recognition and manifest path filling.
:::

### Custom Entries

In addition to built-in entries, you can configure any name in `entry` as a **custom entry** (e.g., `capture`, `my-page`):

```ts
export default defineConfig({
  entry: {
    capture: { src: "capture/index.ts", html: true },
  },
});
```

Custom entries produce standalone pages accessible via `chrome-extension://<id>/capture/index.html`.

## Next Steps

- [File-based Entry](/guide/entry/file-based) — Learn convention-based entry discovery
- [Config-based Entry](/guide/entry/config-based) — Learn explicit entry + manifest configuration
- [manifest configuration](/config/manifest) — Configure extension capabilities
