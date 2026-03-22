import { describe, expect, it } from "@rstest/core";
import { shouldCopyLocalTemplatePath } from "../src/template/bundledCopy.ts";

describe("bundledCopy", () => {
  describe("shouldCopyLocalTemplatePath", () => {
    it("allows normal template paths", () => {
      expect(shouldCopyLocalTemplatePath("/repo/templates/react-ts/package.json")).toBe(true);
      expect(shouldCopyLocalTemplatePath("C:\\repo\\templates\\react-ts\\app\\popup\\App.tsx")).toBe(
        true,
      );
    });

    it("skips node_modules and nested paths under it", () => {
      expect(shouldCopyLocalTemplatePath("/t/node_modules/foo")).toBe(false);
      expect(shouldCopyLocalTemplatePath("C:\\t\\node_modules\\@x\\y")).toBe(false);
      expect(shouldCopyLocalTemplatePath("/t/pkg/node_modules/x")).toBe(false);
    });

    it("skips .git and .pnpm segments", () => {
      expect(shouldCopyLocalTemplatePath("/t/.git/config")).toBe(false);
      expect(shouldCopyLocalTemplatePath("/t/.pnpm/foo")).toBe(false);
    });
  });
});
