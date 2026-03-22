import { defineConfig } from "addfox";
import vue from "@addfox/rsbuild-plugin-vue";

const manifest = {
  name: "Addfox With Vue",
  version: "0.0.1",
  manifest_version: 3,
  description: "Vue template with popup, options, content, background",
  permissions: ["storage", "activeTab"],
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
  content_scripts: [
    {
      matches: ["<all_urls>"],
    },
  ],
};

export default defineConfig({
  manifest: { chromium: manifest, firefox: { ...manifest } },
  plugins: [vue()]
});
