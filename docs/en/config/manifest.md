# manifest

`manifest` declares the extension manifest (the content of the final `manifest.json` in the build output). It supports three styles: **inline object**, **object split by browser** (chromium/firefox), or **file paths**; it can also be **omitted** so the framework auto-loads manifest files from the source directory.

## Type and default behavior

- **Type**: `ManifestConfig | ManifestPathConfig | undefined`
- **Default**: When omitted, the framework loads from `appDir` or `appDir/manifest/`:
  - `manifest.json` (shared or single browser)
  - `manifest.chromium.json` (Chrome overrides)
  - `manifest.firefox.json` (Firefox overrides)
- At build time, the branch is chosen by CLI `-b chrome|edge|brave|vivaldi|opera|santa|firefox` and merged with base, then written to `outputRoot/outDir/manifest.json`.

## Configuration styles

### 1. Single object (Chrome / Firefox shared)

All fields in one object. The framework injects entry paths for `background`, `content_scripts`, `action`, `options_ui`, `side_panel`, `devtools_page` according to the current target; other fields are output as-is.

```ts
// addfox.config.ts
import { defineConfig } from "addfox";

export default defineConfig({
  manifest: {
    name: "My Extension",
    version: "1.0.0",
    manifest_version: 3,
    permissions: ["storage", "activeTab"],
    action: { default_popup: "popup/index.html" },
    background: { service_worker: "background/index.js" },
    content_scripts: [
      { matches: ["<all_urls>"], js: ["content/index.js"], run_at: "document_start" },
    ],
  },
});
```

Entry paths (e.g. `popup/index.html`, `background/index.js`) are computed by the framework from [entry](/config/entry) and [outDir](/config/out-dir). You only need to keep these keys in manifest; see [MANIFEST_ENTRY_PATHS](https://github.com/addfox/addfox/blob/main/packages/core/src/constants.ts) for custom keys.

### 2. Split by browser (chromium / firefox)

When Chrome and Firefox need different manifest fields (e.g. Chrome `action` vs Firefox `sidebar_action`, or `service_worker` vs `scripts`), use `chromium` and `firefox` branches. The framework picks the branch by current `-b` and deep-merges with base.

```ts
// addfox.config.ts
import { defineConfig } from "addfox";

export default defineConfig({
  manifest: {
    chromium: {
      name: "My Ext",
      manifest_version: 3,
      action: { default_popup: "popup/index.html" },
      background: { service_worker: "background/index.js" },
      content_scripts: [{ matches: ["<all_urls>"], js: ["content/index.js"] }],
    },
    firefox: {
      name: "My Ext",
      manifest_version: 2,
      sidebar_action: { default_panel: "sidepanel/index.html" },
      background: { scripts: ["background/index.js"] },
      content_scripts: [{ matches: ["<all_urls>"], js: ["content/index.js"] }],
    },
  },
});
```

### 3. Path config (relative to appDir)

To keep manifest in external JSON files, specify paths **relative to [appDir](/config/app-dir)**.

```ts
// addfox.config.ts
import { defineConfig } from "addfox";

export default defineConfig({
  appDir: "src",
  manifest: {
    chromium: "manifest/manifest.chromium.json",
    firefox: "manifest/manifest.firefox.json",
  },
});
```

### 4. Omit (auto-load)

When `manifest` is not set, the framework looks for:

1. `appDir/manifest.json`, `appDir/manifest.chromium.json`, `appDir/manifest.firefox.json`
2. `appDir/manifest/manifest.json`, `appDir/manifest/manifest.chromium.json`, `appDir/manifest/manifest.firefox.json`

Any found file is used as base and merged with chromium/firefox files in the same directory.

## Specifying entry source files in manifest

You can specify the **source file paths** of entries directly in the manifest. The framework automatically recognizes and builds them, replacing the paths with the output artifact paths.

```ts
// addfox.config.ts
export default defineConfig({
  manifest: {
    name: "My Extension",
    version: "1.0.0",
    manifest_version: 3,
    
    // Specify source file paths directly
    background: {
      service_worker: "./background/index.ts",  // source path
    },
    action: {
      default_popup: "./popup/index.tsx",       // source path
    },
    content_scripts: [
      {
        matches: ["<all_urls>"],
        js: ["./content/index.ts"],              // source path
      },
    ],
  },
});
```

The framework will:
1. Identify these source paths (`.ts`, `.tsx`, `.js`, `.jsx`).
2. Treat them as entries.
3. Replace them with build output paths (e.g. `background/index.js`) in the final `manifest.json`.

### Supported fields

You can use source paths in the following manifest fields:

| Field | Description |
|------|-------------|
| `background.service_worker` | MV3 background script |
| `background.scripts` | MV2 background scripts |
| `background.page` | Background page |
| `action.default_popup` | MV3 popup page |
| `browser_action.default_popup` | MV2 popup page |
| `options_ui.page` / `options_page` | Options page |
| `devtools_page` | DevTools page |
| `side_panel.default_path` | Side panel |
| `sandbox.pages` | Sandbox pages |
| `chrome_url_overrides.newtab` | New tab override |
| `chrome_url_overrides.bookmarks` | Bookmarks override |
| `chrome_url_overrides.history` | History override |
| `content_scripts[].js` | Content scripts |

### Entry resolution priority

1. **Highest**: Explicitly configured entries in `config.entry`.
2. **Second**: Source paths specified in `manifest`.
3. **Third**: Auto-discovery based on file conventions.

## Priority

| Style | Description |
|-------|-------------|
| manifest object or paths in config | Highest |
| manifest*.json in appDir root | Next |
| manifest*.json in appDir/manifest/ | Then |

## Related

- [entry](/config/entry): Entry scripts and HTML determine manifest paths.
- [appDir](/config/app-dir): Path config and auto-load are relative to appDir.
- [outDir](/config/out-dir), [outputRoot](/config/out-dir): Build output directory.
