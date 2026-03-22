import { defineConfig } from "@rslib/core";

export default defineConfig({
  source: {
    entry: {
      cli: "./src/cli/index.ts",
    },
  },
  lib: [
    {
      format: "esm",
      dts: false,
      output: { sourceMap: false, cleanDistPath: true },
    },
  ],
});
