import { defineConfig } from "addfox";
import { pluginReact } from "@rsbuild/plugin-react";

const manifest = {
  name: "Addfox With Tailwind CSS",
  version: "0.0.1",
  manifest_version: 3,
  description: "React + Tailwind CSS v4 template with popup, options, content, background",
  permissions: ["storage", "activeTab", "tabs"],
  options_ui: { open_in_tab: true },
  content_scripts: [
    {
      matches: ["<all_urls>"]
    },
  ],
};

export default defineConfig({
  manifest: { chromium: manifest, firefox: { ...manifest } },
  plugins: [pluginReact()]
});
