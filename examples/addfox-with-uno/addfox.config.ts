import { defineConfig } from "addfox";
import { pluginReact } from "@rsbuild/plugin-react";

const manifest = {
  name: "Addfox With Uno",
  version: "0.0.1",
  manifest_version: 3,
  description: "React + UnoCSS template: popup, options, content, background",
  permissions: ["storage", "activeTab"],
  action: {},
  options_ui: { open_in_tab: true },
  content_scripts: [{ matches: ["<all_urls>"] }],
};

export default defineConfig({
  manifest: { chromium: manifest, firefox: { ...manifest } },
  plugins: [pluginReact()],
});
