import { defineConfig } from "addfox";

const manifest = {
  name: "Test Field Example",
  version: "0.0.1",
  manifest_version: 3,
  description: "Extension tested via the addfox.config test field",
  permissions: ["storage", "activeTab"],
  icons: {
    "16": "icons/icon_128.png",
    "48": "icons/icon_128.png",
    "128": "icons/icon_128.png",
  },
  action: {
    default_icon: {
      16: "icons/icon_128.png",
      48: "icons/icon_128.png",
      128: "icons/icon_128.png",
    },
  },
  content_scripts: [{ matches: ["<all_urls>"] }],
};

export default defineConfig({
  manifest: { chromium: manifest, firefox: { ...manifest } },
  // Rstest config lives here — no rstest.config file needed.
  // If a rstest.config.* file also exists, the file takes precedence.
  test: {
    testEnvironment: "node",
    include: ["__tests__/**/*.test.ts"],
  },
});
