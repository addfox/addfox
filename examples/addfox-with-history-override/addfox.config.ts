import { defineConfig } from "addfox";

const manifest = {
  name: "Addfox With History Override",
  version: "0.0.1",
  manifest_version: 3,
  description: "Built-in history entry with auto-filled chrome_url_overrides.history",
  icons: {
    "16": "icons/icon_128.png",
    "48": "icons/icon_128.png",
    "128": "icons/icon_128.png",
  },
};

export default defineConfig({
  manifest: {
    chromium: manifest,
    firefox: {
      ...manifest,
      browser_specific_settings: {
        gecko: {
          id: "addfox-example-history-override@addfox.com",
        },
      },
    },
  },
});
