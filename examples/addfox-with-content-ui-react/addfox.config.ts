import { defineConfig } from "addfox";
import { pluginReact } from "@rsbuild/plugin-react";

const manifest = {
  name: "Addfox Content UI React",
  version: "0.0.1",
  manifest_version: 3,
  description: "Content script UI with defineContentUI + mountContentUI + React + Tailwind CSS",
  permissions: ["activeTab"],
  action: {},
  content_scripts: [{ matches: ["<all_urls>"] }],
};

export default defineConfig({
  manifest: { chromium: manifest, firefox: manifest },
  plugins: [pluginReact()],
});
