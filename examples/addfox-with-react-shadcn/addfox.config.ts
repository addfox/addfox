import { resolve } from "path";
import { defineConfig } from "addfox";
import { pluginReact } from "@rsbuild/plugin-react";

const manifest = {
  name: "Addfox With React Shadcn",
  version: "0.0.1",
  manifest_version: 3,
  description: "Popup, options, content, background, sidepanel with React and shadcn/ui",
  permissions: ["storage", "activeTab", "sidePanel"],
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
};

export default defineConfig({
  manifest: { chromium: manifest, firefox: { ...manifest } },
  plugins: [pluginReact()],
  rsbuild: {
    resolve: { alias: { "@": resolve(process.cwd(), "app") } },
  },
  browserPath: { chrome: "C:\\Users\\GomiGXY\\Downloads\\chrome-win64\\chrome.exe" },
});
