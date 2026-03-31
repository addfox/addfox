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
  server: {
    port: 3041,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3040',
        changeOrigin: true,
      },
      '/api/ws': {
        target: 'ws://127.0.0.1:3040',
        ws: true,
      },
    },
  },
  output: {
    distPath: {
      root: '../dist-ui',
    },
    cleanDistPath: true,
  },
});
