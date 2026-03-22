import { defineConfig } from "addfox";

const chromiumManifest = {
  name: "Addfox With Firefox",
  version: "0.0.1",
  manifest_version: 3,
  description: "Firefox template with popup, content, background",
  permissions: ["storage", "activeTab"],
  host_permissions: ["<all_urls>"],
  icons: {
    "16": "icons/icon_128.png",
    "48": "icons/icon_128.png",
    "128": "icons/icon_128.png",
  },
  action: {
    default_icon: {
      16: "icons/icon_128.png",
      48: "icons/icon_128.png",
      128: "icons/icon_128.png",
    },
  },
  content_scripts: [{ matches: ["<all_urls>"] }],
};

const firefoxManifest = {
  name: "Addfox With Firefox",
  version: "0.0.1",
  manifest_version: 3,
  description: "Firefox template with popup, content, background",
  permissions: ["storage", "activeTab"],
  host_permissions: ["<all_urls>"],
  icons: {
    "16": "icons/icon_128.png",
    "48": "icons/icon_128.png",
    "128": "icons/icon_128.png",
  },
  action: {
    default_icon: {
      16: "icons/icon_128.png",
      48: "icons/icon_128.png",
      128: "icons/icon_128.png",
    },
  },
  content_scripts: [{ matches: ["<all_urls>"] }],
  browser_specific_settings: {
    gecko: {
      id: "firefox-template@addfox.local",
      strict_min_version: "109.0",
    },
  },
};

export default defineConfig({
  manifest: { chromium: chromiumManifest, firefox: firefoxManifest },
  /** Dev: enable error monitor → terminal + `.addfox/error.md` (or use CLI `addfox dev --debug`). */
  debug: true,
  // browserPath: {
  //   firefox: "C:\\Program Files\\Mozilla Firefox\\firefox.exe",
  // },
  cache: true,
});
