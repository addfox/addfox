import { defineConfig } from "@rstest/core";

export default defineConfig({
  testEnvironment: "node",
  include: ["__tests__/**/*.test.ts"],
  exclude: { patterns: ["**/node_modules/**", "**/dist/**"] },
  root: process.cwd(),
});
