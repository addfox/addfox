import { describe, it, expect } from "@rstest/core";
import { shouldCopyLocalTemplatePath } from "../src/template/bundledCopy.js";

describe("bundledCopy", () => {
  describe("shouldCopyLocalTemplatePath", () => {
    it("should return true for paths outside template root", () => {
      const templateRoot = "/tmp/template";
      const src = "/other/path/file.txt";
      expect(shouldCopyLocalTemplatePath(src, templateRoot)).toBe(true);
    });

    it("should return false for node_modules inside template", () => {
      const templateRoot = "/tmp/template";
      const src = "/tmp/template/node_modules/package/file.js";
      expect(shouldCopyLocalTemplatePath(src, templateRoot)).toBe(false);
    });

    it("should return false for .git inside template", () => {
      const templateRoot = "/tmp/template";
      const src = "/tmp/template/.git/config";
      expect(shouldCopyLocalTemplatePath(src, templateRoot)).toBe(false);
    });

    it("should return true for regular paths inside template", () => {
      const templateRoot = "/tmp/template";
      const src = "/tmp/template/src/index.ts";
      expect(shouldCopyLocalTemplatePath(src, templateRoot)).toBe(true);
    });

    it("should return false for .pnpm inside template", () => {
      const templateRoot = "/tmp/template";
      const src = "/tmp/template/.pnpm/file.js";
      expect(shouldCopyLocalTemplatePath(src, templateRoot)).toBe(false);
    });

    it("should handle relative paths starting with ..", () => {
      const templateRoot = "/tmp/template";
      const src = "../outside/file.txt";
      expect(shouldCopyLocalTemplatePath(src, templateRoot)).toBe(true);
    });
  });
});
