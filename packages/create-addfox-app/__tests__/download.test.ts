import { describe, expect, it } from "@rstest/core";
import { shouldCopyLocalTemplatePath } from "../src/template/bundledCopy.ts";

describe("bundledCopy", () => {
  describe("shouldCopyLocalTemplatePath", () => {
    const rootPosix = "/repo/templates/template-react-ts";
    const rootWin = "C:\\repo\\templates\\template-react-ts";

    it("allows normal template paths", () => {
      expect(
        shouldCopyLocalTemplatePath(`${rootPosix}/package.json`, rootPosix),
      ).toBe(true);
      expect(
        shouldCopyLocalTemplatePath(`${rootWin}\\app\\popup\\App.tsx`, rootWin),
      ).toBe(true);
    });

    it("still copies when install path contains .pnpm or outer node_modules", () => {
      const pnpmRoot =
        "C:\\Users\\x\\node_modules\\.pnpm\\create-addfox-app@1\\node_modules\\create-addfox-app\\templates\\template-react-ts";
      const pkg = `${pnpmRoot}\\package.json`;
      expect(shouldCopyLocalTemplatePath(pkg, pnpmRoot)).toBe(true);
    });

    it("skips node_modules and nested paths under template root", () => {
      expect(shouldCopyLocalTemplatePath("/t/node_modules/foo", "/t")).toBe(false);
      expect(shouldCopyLocalTemplatePath("C:\\t\\node_modules\\@x\\y", "C:\\t")).toBe(false);
      expect(shouldCopyLocalTemplatePath("/t/pkg/node_modules/x", "/t")).toBe(false);
    });

    it("skips .git and .pnpm dirs inside the template", () => {
      expect(shouldCopyLocalTemplatePath("/t/.git/config", "/t")).toBe(false);
      expect(shouldCopyLocalTemplatePath("/t/.pnpm/foo", "/t")).toBe(false);
    });
  });
});
