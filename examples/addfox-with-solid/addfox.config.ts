import { defineConfig } from "addfox";
import { pluginBabel } from "@rsbuild/plugin-babel";
import { pluginSolid } from "@rsbuild/plugin-solid";

const manifest = {
  name: "Addfox With Solid",
  version: "0.0.1",
  manifest_version: 3,
  description: "Solid template with popup, options, content, background",
  permissions: ["storage", "activeTab"],
  content_scripts: [
    {
      matches: ["<all_urls>"]
    },
  ],
};

export default defineConfig({
  manifest: { chromium: manifest, firefox: { ...manifest } },
  plugins: [pluginBabel({ include: /\.(?:jsx|tsx)$/ }), pluginSolid()],
});
