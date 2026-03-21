import { defineConfig } from "addfox";

const manifest = {
  name: "Addfox With Devtools",
  version: "0.0.1",
  manifest_version: 3,
  description: "Chrome DevTools panel in pure TypeScript",
};

export default defineConfig({
  manifest: { chromium: manifest, firefox: { ...manifest } },
  browserPath: { chrome: "C:\\Users\\GomiGXY\\Downloads\\chrome-win64\\chrome.exe" },
});
