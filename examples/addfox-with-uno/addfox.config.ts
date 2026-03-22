import { defineConfig } from "addfox";
import { pluginReact } from "@rsbuild/plugin-react";

const manifest = {
  name: "Addfox With Uno",
  version: "0.0.1",
  manifest_version: 3,
  description: "React + UnoCSS template: popup, options, content, background",
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
  options_ui: { open_in_tab: true },
  content_scripts: [{ matches: ["<all_urls>"] }],
};

export default defineConfig({
  manifest: { chromium: manifest, firefox: { ...manifest } },
  plugins: [pluginReact()],
});
