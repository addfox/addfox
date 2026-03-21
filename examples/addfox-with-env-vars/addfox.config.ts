import { defineConfig } from "addfox";

const manifest = {
  name: "Addfox With Env Vars",
  version: "0.0.1",
  manifest_version: 3,
  description: "Check which env vars are bundled in dev/build",
  permissions: ["storage"],
  action: {},
  content_scripts: [{ matches: ["<all_urls>"] }],
};

export default defineConfig({
  manifest: { chromium: manifest, firefox: { ...manifest } },
});
