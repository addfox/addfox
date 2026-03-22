import { defineConfig } from "addfox";

const manifest = {
  name: "My Extension",
  version: "1.0.0",
  manifest_version: 3,
  description: "Browser extension built with addfox",
  permissions: ["activeTab"],
  icons: {
    "16": "icons/icon_128.png",
    "48": "icons/icon_128.png",
    "128": "icons/icon_128.png",
  },
};

export default defineConfig({
  manifest: { chromium: manifest, firefox: { ...manifest } },
});
