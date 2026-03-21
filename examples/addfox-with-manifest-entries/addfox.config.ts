import { defineConfig } from "addfox";

/**
 * 示例：完全通过 manifest 声明所有内置入口，不使用 config.entry。
 * 各字段使用源文件路径（.ts/.tsx），addfox 会从中解析入口并替换为构建产物路径。
 */
const manifest = {
  name: "Addfox Manifest Entries",
  version: "0.0.1",
  manifest_version: 3,
  description: "All built-in entries defined in manifest: background, popup, options, content, devtools, sidepanel, sandbox, newtab, bookmarks, history",
  permissions: ["storage", "activeTab", "tabs", "bookmarks", "history", "sidePanel"],
  action: {
    default_popup: "popup/index.ts",
    default_title: "Popup",
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
