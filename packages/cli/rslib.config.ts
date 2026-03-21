import { defineConfig } from "@rslib/core";

export default defineConfig({
  source: {
    entry: {
      cli: "./src/cli.ts",
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
  // Avoid bundling @rspack/resolver optional platform files (e.g. resolver.android-arm64) that trigger "Module not found" warnings.
  // @rsdoctor/rspack-plugin is optional (report); loaded at runtime when -r/--report is used.
  output: {
    externals: ["@rspack/resolver", "@rsdoctor/rspack-plugin"],
  },
});
