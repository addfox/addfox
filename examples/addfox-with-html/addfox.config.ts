import { defineConfig } from "addfox";

const manifest = {
  name: "Addfox With HTML",
  version: "0.0.1",
  manifest_version: 3,
  description: "Manifest HTML entries with Addfox template watching",
  action: {
    default_popup: "./popup/index.html",
  },
  options_ui: {
    page: "./options/index.html",
    open_in_tab: true,
  },
  devtools_page: "./devtools/index.html",
};

export default defineConfig({
  manifest: {
    chromium: manifest,
    firefox: manifest,
  },
});
