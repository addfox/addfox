import { defineConfig } from "@rslib/core";
import { RsdoctorRspackPlugin } from "@rsdoctor/rspack-plugin";

const rsdoctorPlugin = process.env.RSDOCTOR === "true"
  ? [new RsdoctorRspackPlugin({
      output: {
        mode: "brief",
        reportDir: "./.rsdoctor",
      },
    })]
  : [];

export default defineConfig({
  source: {
    entry: {
      index: "./src/index.ts",
    },
  },
  lib: [
    {
      format: "esm",
      dts: true,
      output: {
        distPath: { root: "./dist/esm" },
        sourceMap: false,
        cleanDistPath: true,
      },
    },
    {
      format: "cjs",
      dts: false,
      output: {
        distPath: { root: "./dist/cjs" },
        sourceMap: false,
      },
    },
  ],
  tools: {
    rspack: {
      plugins: rsdoctorPlugin as any,
    },
  },
});
