import { defineConfig } from "addfox";
import { pluginSvelte } from "@rsbuild/plugin-svelte";

const manifest = {
  name: "My Extension",
  version: "1.0.0",
  manifest_version: 3,
  description: "Browser extension built with addfox",
  permissions: ["storage", "activeTab"],
};

export default defineConfig({
  manifest: { chromium: manifest, firefox: { ...manifest } },
  plugins: [pluginSvelte()],
});
