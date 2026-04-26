import { defineConfig } from "addfox";
import { pluginReact } from "@rsbuild/plugin-react";

const manifest = {
  name: "Addfox With Firefox React",
  version: "0.0.1",
  manifest_version: 3,
  description: "Firefox React template with popup, options, content, background",
  permissions: ["storage", "activeTab", "tabs"],
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
  manifest: {
    chromium: manifest,
    firefox: {
      ...manifest,
      browser_specific_settings: {
        gecko: {
          id: "firefox-react-template@addfox.local",
          strict_min_version: "109.0",
        },
      },
    },
  },
  plugins: [pluginReact()],
});
