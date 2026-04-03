# Addfox - No Manifest Example

This example demonstrates **Addfox's auto-manifest generation** feature. You can build a complete browser extension without writing a single line of manifest configuration!

## ✨ Key Features

- **Zero Manifest Configuration** - No `manifest.json` file needed
- **Auto Discovery** - Entries are automatically detected from folder structure
- **Smart Defaults** - Required fields auto-filled with sensible values
- **Type Aware** - Correctly generates MV2/MV3 format for different browsers

## 📁 Project Structure

```
app/
├── background/index.ts    → Auto-added as background.service_worker
├── content/index.ts       → Auto-added as content_scripts[0]
├── popup/                 → Auto-added as action.default_popup
│   ├── index.html
│   └── index.ts
└── options/               → Auto-added as options_ui.page
    ├── index.html
    └── index.ts
```

## 🚀 How It Works

### 1. No Manifest in Config

```typescript
// addfox.config.ts
import { defineConfig } from "addfox";

export default defineConfig({
  // No manifest property needed!
});
```

### 2. Auto-Generated Manifest

When you run `addfox dev` or `addfox build`, Addfox:

1. Discovers entries from `app/` folder
2. Generates manifest with all required fields
3. Fills entry paths automatically
4. Adds necessary permissions

**Generated Manifest (MV3 Chromium):**

```json
{
  "manifest_version": 3,
  "name": "Extension",
  "version": "1.0.0",
  "background": {
    "service_worker": "background/index.js"
  },
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["content/index.js"],
    "run_at": "document_idle"
  }],
  "action": {
    "default_popup": "popup/index.html"
  },
  "options_ui": {
    "page": "options/index.html",
    "open_in_tab": true
  }
}
```

### 3. Auto-Fill Missing Fields

If you provide a partial manifest, Addfox auto-fills missing fields:

```typescript
export default defineConfig({
  manifest: {
    name: "My Extension",        // ✓ Uses your value
    // version: "1.0.0",         // ✗ Auto-filled: "1.0.0"
    // manifest_version: 3,      // ✗ Auto-filled: 3
    permissions: ["storage"],    // ✓ Uses your value
  }
});
```

## 🛠️ Run the Example

```bash
# From addfox root
pnpm install

# Navigate to example
cd examples/addfox-with-no-manifest

# Development mode (auto-opens Chrome)
pnpm run dev

# Production build for Chrome
pnpm run build

# Production build for Firefox
pnpm run build:firefox
```

## 📝 Supported Entry Types

| Folder | Generated Manifest Field | Description |
|--------|-------------------------|-------------|
| `background/` | `background.service_worker` / `background.scripts` | Service worker (MV3) or background scripts (MV2) |
| `content/` | `content_scripts[]` | Content script injected into web pages |
| `popup/` | `action.default_popup` / `browser_action.default_popup` | Popup UI when clicking extension icon |
| `options/` | `options_ui.page` / `options_page` | Options/settings page |
| `devtools/` | `devtools_page` | DevTools extension page |
| `sidepanel/` | `side_panel.default_path` | Side panel (MV3 Chromium only) |
| `sandbox/` | `sandbox.pages` | Sandbox pages |
| `newtab/` | `chrome_url_overrides.newtab` | New Tab page override |
| `bookmarks/` | `chrome_url_overrides.bookmarks` + `permissions: ["bookmarks"]` | Bookmarks page override |
| `history/` | `chrome_url_overrides.history` + `permissions: ["history"]` | History page override |

## 🎯 Browser Support

Addfox automatically adapts the generated manifest for different browsers:

| Browser | Manifest Version | Notes |
|---------|-----------------|-------|
| Chrome | MV3 | Uses `background.service_worker`, `action` |
| Firefox | MV3 | Uses `background.scripts` (no service_worker) |
| Firefox | MV2 | Uses `background.scripts`, `browser_action` |

## 📚 Learn More

- [Addfox Documentation](../../docs)
- [Manifest Generation Guide](../../docs/guide/manifest)
- [Entry Discovery](../../docs/guide/entry-discovery)
