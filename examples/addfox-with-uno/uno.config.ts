import { defineConfig, presetUno } from "unocss";

export default defineConfig({
  content: {
    filesystem: ["./app/**/*.{html,js,ts,jsx,tsx}"],
  },
  presets: [presetUno()],
});
