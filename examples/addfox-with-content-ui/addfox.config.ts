import { defineConfig } from "addfox";

const manifest = {
  name: "Addfox Content UI",
  version: "0.0.1",
  manifest_version: 3,
  description: "Demonstrates defineContentUI and mountContentUI from @addfox/utils",
  permissions: ["activeTab"],
  action: {},
  content_scripts: [{ matches: ["<all_urls>"] }],
};

export default defineConfig({
  manifest: { chromium: manifest, firefox: { ...manifest } },
});
