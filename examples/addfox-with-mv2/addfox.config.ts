import { defineConfig } from "addfox";

/** Chromium MV2 manifest (deprecated). Building with -t chromium will trigger the MV2 warning. */
const manifest = {
  name: "Addfox With MV2",
  version: "0.0.1",
  manifest_version: 2,
  description: "Example extension with Manifest V2 for Chromium (deprecated; use MV3)",
  permissions: ["storage", "activeTab", "<all_urls>"],
  icons: {
    "16": "icons/icon_128.png",
    "48": "icons/icon_128.png",
    "128": "icons/icon_128.png",
  },
  browser_action: {
    default_icon: {
      "16": "icons/icon_128.png",
      "48": "icons/icon_128.png",
      "128": "icons/icon_128.png",
    },
  },
  content_scripts: [{ matches: ["<all_urls>"] }],
};

export default defineConfig({
  manifest,
});
