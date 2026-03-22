import { defineConfig } from "addfox";

const manifest = {
  name: "Addfox With Env Vars",
  version: "0.0.1",
  manifest_version: 3,
  description: "Check which env vars are bundled in dev/build",
  permissions: ["storage"],
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

export default defineConfig({
  manifest: { chromium: manifest, firefox: { ...manifest } },
});
