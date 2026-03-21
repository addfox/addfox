import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "@rstest/core";
import { applyTestAndReportSetup, generateRstestConfig } from "../src/testSetup.ts";

describe("testSetup", () => {
  it("generateRstestConfig unit-only includes node env", () => {
    const cfg = generateRstestConfig("ts", ["unit"]);
    expect(cfg).toContain("testEnvironment: \"node\"");
    expect(cfg).toContain("__tests__/**/*.test.ts");
    expect(cfg).not.toContain("projects:");
  });

  it("generateRstestConfig e2e-only uses browser project", () => {
    const cfg = generateRstestConfig("js", ["e2e"]);
    expect(cfg).toContain("provider: \"playwright\"");
    expect(cfg).toContain("__tests__/e2e/**/*.test.js");
  });

  it("generateRstestConfig unit+e2e excludes e2e from node project", () => {
    const cfg = generateRstestConfig("ts", ["unit", "e2e"]);
    expect(cfg).toContain("name: \"node\"");
    expect(cfg).toContain("__tests__/e2e/**");
  });

  it("generateRstestConfig empty returns empty string", () => {
    expect(generateRstestConfig("ts", [])).toBe("");
  });

  it("applyTestAndReportSetup writes rstest and deps", () => {
    const dir = mkdtempSync(join(tmpdir(), "addfox-testsetup-"));
    try {
      const pkgPath = join(dir, "package.json");
      writeFileSync(
        pkgPath,
        JSON.stringify(
          { name: "x", version: "1.0.0", private: true, type: "module", scripts: {} },
          null,
          2
        ),
        "utf-8"
      );

      applyTestAndReportSetup(dir, "ts", {
        testKinds: ["unit"],
        installRsdoctor: true,
      });

      const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as {
        devDependencies: Record<string, string>;
        scripts: Record<string, string>;
      };
      expect(pkg.devDependencies["@rstest/core"]).toBeDefined();
      expect(pkg.devDependencies["@rstest/coverage-istanbul"]).toBeDefined();
      expect(pkg.devDependencies["@rsdoctor/rspack-plugin"]).toBeDefined();
      expect(pkg.scripts.test).toBe("addfox test");

      const rstest = readFileSync(join(dir, "rstest.config.ts"), "utf-8");
      expect(rstest).toContain("defineConfig");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
