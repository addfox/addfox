import { defineConfig } from '@rslib/core';
import { RsdoctorRspackPlugin } from '@rsdoctor/rspack-plugin';

const rsdoctorPlugin = process.env.RSDOCTOR === 'true'
  ? [new RsdoctorRspackPlugin({
      output: {
        mode: 'brief',
        reportDir: './.rsdoctor',
      },
    })]
  : [];

export default defineConfig({
  lib: [
    {
      format: 'esm',
      output: {
        distPath: {
          root: './dist/esm',
        },
      },
      dts: true,
    },
    {
      format: 'cjs',
      output: {
        distPath: {
          root: './dist/cjs',
        },
      },
      dts: true,
    },
  ],
  source: {
    entry: {
      index: './src/index.ts',
      browser: './src/browser/index.ts',
    },
  },
  output: {
    target: 'node',
    cleanDistPath: true,
  },
  tools: {
    rspack: {
      plugins: rsdoctorPlugin as unknown as import('rspack').Configuration['plugins'],
    },
  },
});
