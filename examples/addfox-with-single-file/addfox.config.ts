import { defineConfig } from "addfox";

const manifest = {
  name: "Addfox With Single File",
  version: "0.0.1",
  manifest_version: 3,
  description: "Single file entries: popup.html, options.html, background.ts, content.ts",
  permissions: ["storage", "activeTab"],
  host_permissions: ["<all_urls>"],
  action: {},
  options_ui: { open_in_tab: true },
  content_scripts: [{ matches: ["<all_urls>"] }],
};

const firefoxManifest = {
  name: "Addfox With Single File",
  version: "0.0.1",
  manifest_version: 3,
  description: "Single file entries: popup.html, options.html, background.ts, content.ts",
  permissions: ["storage", "activeTab"],
  host_permissions: ["<all_urls>"],
  action: {},
  options_ui: { open_in_tab: true },
  content_scripts: [{ matches: ["<all_urls>"] }],
  browser_specific_settings: {
    gecko: {
      id: "addfox-example-single-file-template@addfox.com",
    },
  },
};

export default defineConfig({
  manifest: { chromium: manifest, firefox: firefoxManifest},
  browserPath: {
    vivaldi: "C:\\apps\\browser\\Application\\vivaldi.exe",
  },
  // cache: true,
});
