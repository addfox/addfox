import { defineConfig } from "@rslib/core";

export default defineConfig({
  source: {
    entry: {
      index: "./src/index.ts",
      cli: "./src/cli.ts",
      "chromium/index": "./src/chromium/index.ts",
      "gecko/index": "./src/gecko/index.ts",
    },
  },
  lib: [
    {
      format: "esm",
      dts: true,
      output: {
        sourceMap: true,
        cleanDistPath: true,
      },
    },
  ],
});
