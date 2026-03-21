import { defineConfig } from "addfox";
import vue from "@addfox/rsbuild-plugin-vue";

const manifest = {
  name: "Addfox With Vue TSX",
  version: "0.0.1",
  manifest_version: 3,
  description: "Vue 3 + TSX template: popup, options, content, background",
  permissions: ["storage", "activeTab"],
  content_scripts: [
    {
      matches: ["<all_urls>"],
    },
  ],
};

export default defineConfig({
  manifest: { chromium: manifest, firefox: { ...manifest } },
  plugins: [vue()],
});
