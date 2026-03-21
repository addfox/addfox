import { defineConfig } from "addfox";
import { pluginReact } from "@rsbuild/plugin-react";

const manifest = {
  name: "Addfox With React",
  version: "0.0.1",
  manifest_version: 3,
  description: "React template with popup, options, content, background",
  permissions: ["storage", "activeTab", "tabs"],
  action: {
    default_icon: { 16: "/icons/icon_16.png", 48: "/icons/icon_48.png" },
  },
  options_ui: { open_in_tab: true },
  content_scripts: [{ matches: ["<all_urls>"] }],
};

export default defineConfig({
  manifest: { chromium: manifest, firefox: { ...manifest } },
  plugins: [pluginReact()],
  browserPath: {
    arc: 'C:\\Users\\GomiGXY\\AppData\\Local\\Microsoft\\WindowsApps\\Arc.exe',
    browseros: 'C:\\Users\\GomiGXY\\AppData\\Local\\BrowserOS\\BrowserOS\\Application\\chrome.exe',
  }
});
