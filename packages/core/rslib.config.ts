import { defineConfig } from "@rslib/core";

export default defineConfig({
  source: {
    entry: {
      index: "./src/index.ts",
      "pipeline/index": "./src/pipeline/index.ts",
    },
  },
  lib: [
    {
      format: "esm",
      dts: true,
      output: {
        distPath: { root: "./dist/esm" },
        sourceMap: true,
        cleanDistPath: true,
      },
    },
    {
      format: "cjs",
      dts: false,
      output: {
        distPath: { root: "./dist/cjs" },
        sourceMap: true,
      },
    },
  ],
});
