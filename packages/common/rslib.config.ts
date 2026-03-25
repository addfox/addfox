import { defineConfig } from '@rslib/core';

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
});
