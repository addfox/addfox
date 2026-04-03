import { defineConfig } from "addfox";

/**
 * Example: declare all built-in entries through the manifest without using config.entry.
 * Each field uses source file paths (.ts/.tsx), and addfox resolves them to built output paths.
 */
const manifest = {
  name: "Addfox Manifest Entries",
  version: "0.0.1",
  manifest_version: 3,
  description: "All built-in entries defined in manifest: background, popup, options, content, devtools, sidepanel, sandbox, newtab, bookmarks, history",
  permissions: ["storage", "activeTab", "tabs", "bookmarks", "history", "sidePanel"],
  icons: {
    "16": "icons/icon_128.png",
    "48": "icons/icon_128.png",
    "128": "icons/icon_128.png",
  },
  action: {
    default_popup: "popup/index.ts",
    default_title: "Popup",
    default_icon: {
      16: "icons/icon_128.png",
      48: "icons/icon_128.png",
      128: "icons/icon_128.png",
    },
  },
  options_ui: { page: "options/index.ts", open_in_tab: true },
  background: { service_worker: "background/index.ts" },
  content_scripts: [
    {
      matches: ["<all_urls>"],
      js: ["content/index.ts"],
      run_at: "document_idle",
    },
  ],
  devtools_page: "devtools/index.ts",
  side_panel: { default_path: "sidepanel/index.ts" },
  sandbox: { pages: ["sandbox/index.ts"] },
  content_security_policy: {
    sandbox: "sandbox allow-scripts; script-src 'self' 'unsafe-inline'",
  },
  chrome_url_overrides: {
    newtab: "newtab/index.ts",
    // bookmarks: "bookmarks/index.ts",
    // history: "history/index.ts",
  },
};

const firefoxManifest = {
  ...manifest,
  browser_specific_settings: {
    gecko: {
      id: "addfox-manifest-entries@example.com",
    },
  },
};

export default defineConfig({
  manifest: { chromium: manifest, firefox: firefoxManifest },
});
