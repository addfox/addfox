import { defineConfig } from "@rslib/core";

export default defineConfig({
  source: {
    entry: {
      cli: "./src/cli/index.ts",
      index: "./src/index.ts",
    },
  },
  lib: [
    {
      format: "esm",
      dts: true,
      output: { sourceMap: false, cleanDistPath: true },
    },
  ],
});
