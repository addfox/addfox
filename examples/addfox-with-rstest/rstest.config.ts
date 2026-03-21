import { defineConfig } from "@rstest/core";

export default defineConfig({
  testEnvironment: "node",
  include: ["__tests__/**/*.test.ts"],
  root: process.cwd(),
});
