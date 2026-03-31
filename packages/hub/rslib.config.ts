import { defineConfig } from "@rslib/core";

export default defineConfig({
  source: {
    entry: {
      cli: "./src/cli.ts",
      server: "./src/server/index.ts",
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
  output: {
    target: "node",
    externals: [
      // Node built-ins
      "fs",
      "path",
      "os",
      "child_process",
      "crypto",
      "http",
      "https",
      "stream",
      "util",
      "url",
      "events",
      // External deps that should not be bundled
      "fsevents",
    ],
  },
});
