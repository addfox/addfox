import { defineConfig } from "addfox";
import { pluginSvelte } from "@rsbuild/plugin-svelte";

const manifest = {
  name: "Addfox With Svelte",
  version: "0.0.1",
  manifest_version: 3,
  description: "Svelte template with popup, options, content, background",
  permissions: ["storage", "activeTab"],
  
  options_ui: { open_in_tab: true },
  content_scripts: [
    {
      matches: ["<all_urls>"]
    },
  ],
};

export default defineConfig({
  manifest: { chromium: manifest, firefox: { ...manifest } },
  plugins: [pluginSvelte()],
});
