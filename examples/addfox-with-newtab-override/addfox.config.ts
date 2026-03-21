import { defineConfig } from "addfox";

const manifest = {
  name: "Addfox With Newtab Override",
  version: "0.0.1",
  manifest_version: 3,
  description: "Built-in newtab entry with auto-filled chrome_url_overrides.newtab",
};

export default defineConfig({
  manifest: {
    chromium: manifest,
    firefox: {
      ...manifest,
      browser_specific_settings: {
        gecko: {
          id: "addfox-example-newtab-override@addfox.com",
        },
      },
    },
  },
});
