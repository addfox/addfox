import { defineConfig } from "@rslib/core";

export default defineConfig({
  source: {
    entry: {
      index: "./src/index.ts",
      runtime: "./src/runtime.ts",
    },
  },
  lib: [
    {
      format: "esm",
      dts: true,
      output: {
        sourceMap: true,
        // Keep sibling entry outputs stable in watch mode. The public
        // `addfox/monitor` facade re-exports `./dist/runtime.js`, so removing
        // it while `index` is rebuilding breaks dev consumers.
        cleanDistPath: false,
      },
    },
  ],
});
