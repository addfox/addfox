import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';

export default defineConfig({
  plugins: [pluginReact()],
  source: {
    entry: {
      index: './src/main.tsx',
    },
    alias: {
      '@': './src',
    },
  },
  html: {
    template: './index.html',
  },

  output: {
    distPath: {
      root: '../dist-ui',
    },
    cleanDistPath: true,
  },
});
