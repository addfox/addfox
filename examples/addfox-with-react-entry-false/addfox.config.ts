import { defineConfig } from "addfox";
import { pluginReact } from "@rsbuild/plugin-react";

const manifest = {
  name: "Addfox With React Entry False",
  version: "0.0.1",
  manifest_version: 3,
  description: "React extension with entry: false, entries in rsbuild",
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
  options_ui: { open_in_tab: true },
  content_scripts: [{ matches: ["<all_urls>"] }],
};

export default defineConfig({
  entry: false,
  appDir: "app",
  debug: true,
  manifest: { chromium: manifest, firefox: { ...manifest } },
  plugins: [pluginReact()],
  rsbuild: {
    source: {
      entry: {
        popup: "./app/popup/index.tsx",
        options: "./app/options/index.tsx",
        background: {
          import: "./app/background/index.ts",
          html: false,
        },
        content: {
          import: "./app/content/index.ts",
          html: false,
        },
      },
    },
    html: {
      outputStructure: "nested"
    },
    output: {
      filenameHash: false,
      distPath: { root: ".addfox/dist", js: ".", css: "." },
      filename: {
        js: (pathData: { chunk?: { name?: string } }) => {
          const name = pathData.chunk?.name ?? "index";
          if (name === "background" || name === "content") return "[name].js";
          return "[name]/index.js";
        },
        css: (pathData: { chunk?: { name?: string } }) => {
          const name = pathData.chunk?.name ?? "index";
          if (name === "background" || name === "content") return "[name].css";
          return "[name]/index.css";
        },
      },
      copy: [{ from: "./public/icons", to: "./icons" }],
    },
  },
  cache: true
});
