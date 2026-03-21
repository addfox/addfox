import { defineConfig } from "addfox";

const manifest = {
  name: "Rstest Unit Example",
  version: "0.0.1",
  manifest_version: 3,
  description: "Extension with rstest unit tests",
  permissions: ["storage", "activeTab"],
  action: {},
  content_scripts: [{ matches: ["<all_urls>"] }],
};

export default defineConfig({
  manifest: { chromium: manifest, firefox: { ...manifest } },
});
