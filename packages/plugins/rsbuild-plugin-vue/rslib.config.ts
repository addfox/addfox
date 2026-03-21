import { defineConfig } from "@rslib/core";

export default defineConfig({
  source: {
    entry: { index: "./src/index.ts" },
  },
  lib: [
    {
      format: "esm",
      dts: true,
      output: { sourceMap: true, cleanDistPath: true },
    },
  ],
});
