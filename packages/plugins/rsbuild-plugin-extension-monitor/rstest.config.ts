import { defineConfig } from "@rstest/core";

export default defineConfig({
  include: ["__tests__/**/*.test.ts"],
  exclude: { patterns: ["**/node_modules/**", "**/dist/**"] },
  testEnvironment: "node",
  root: process.cwd(),
  tools: {
    rspack: (config: { module?: { rules?: unknown[] } }) => {
      config.module = config.module ?? {};
      config.module.rules = config.module.rules ?? [];
      config.module.rules.unshift({ test: /\.html$/, type: "asset/source" });
      return config;
    },
  },
});
