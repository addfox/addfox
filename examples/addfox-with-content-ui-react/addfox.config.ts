import { defineConfig } from "addfox";
import { pluginReact } from "@rsbuild/plugin-react";

const manifest = {
  name: "Addfox Content UI React",
  version: "0.0.1",
  manifest_version: 3,
  description: "Content script UI with defineContentUI + mountContentUI + React + Tailwind CSS",
  permissions: ["activeTab"],
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
  manifest: { chromium: manifest, firefox: manifest },
  plugins: [pluginReact()],
});
