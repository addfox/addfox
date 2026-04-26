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
    entry: { index: "./src/index.ts" },
  },
  lib: [
    {
      format: "esm",
      dts: true,
      output: { sourceMap: true, cleanDistPath: true },
    },
  ],
  tools: {
    rspack: {
      plugins: rsdoctorPlugin as any,
    },
  },
});
