import { describe, expect, it, beforeEach, afterEach } from "@rstest/core";
import { mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { tmpdir } from "node:os";
import { updatePackageVersions, resolveLatestVersion } from "../src/cli/index.ts";

describe("updatePackageVersions", () => {
  let testDir: string;

  beforeEach(() => {
    testDir = resolve(tmpdir(), `versions-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) rmSync(testDir, { recursive: true, force: true });
  });

  function writePkg(data: {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  }) {
    writeFileSync(
      resolve(testDir, "package.json"),
      JSON.stringify({ name: "test", ...data }, null, 2),
    );
  }

  function readPkg() {
    return JSON.parse(
      readFileSync(resolve(testDir, "package.json"), "utf-8"),
    ) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
  }

  it("updates addfox in devDependencies when version is provided", () => {
    writePkg({ devDependencies: { addfox: "^0.2.0" } });
    updatePackageVersions(testDir, { addfox: "0.2.2" });
    const pkg = readPkg();
    expect(pkg.devDependencies?.addfox).toBe("^0.2.2");
  });

  it("updates @addfox/utils in dependencies when version is provided", () => {
    writePkg({ dependencies: { "@addfox/utils": "^0.2.0" } });
    updatePackageVersions(testDir, { utils: "0.2.2" });
    const pkg = readPkg();
    expect(pkg.dependencies?.["@addfox/utils"]).toBe("^0.2.2");
  });

  it("updates @addfox/utils in devDependencies when version is provided", () => {
    writePkg({ devDependencies: { "@addfox/utils": "^0.2.0" } });
    updatePackageVersions(testDir, { utils: "0.2.2" });
    const pkg = readPkg();
    expect(pkg.devDependencies?.["@addfox/utils"]).toBe("^0.2.2");
  });

  it("updates both addfox and @addfox/utils simultaneously", () => {
    writePkg({
      dependencies: { "@addfox/utils": "^0.2.0" },
      devDependencies: { addfox: "^0.2.0", "@addfox/utils": "^0.2.0" },
    });
    updatePackageVersions(testDir, { addfox: "0.2.2", utils: "0.2.2" });
    const pkg = readPkg();
    expect(pkg.devDependencies?.addfox).toBe("^0.2.2");
    expect(pkg.dependencies?.["@addfox/utils"]).toBe("^0.2.2");
    expect(pkg.devDependencies?.["@addfox/utils"]).toBe("^0.2.2");
  });

  it("leaves other dependencies untouched", () => {
    writePkg({
      dependencies: { react: "^18.0.0", "@addfox/utils": "^0.2.0" },
      devDependencies: { typescript: "^5.0.0", addfox: "^0.2.0" },
    });
    updatePackageVersions(testDir, { addfox: "0.2.2", utils: "0.2.2" });
    const pkg = readPkg();
    expect(pkg.dependencies?.react).toBe("^18.0.0");
    expect(pkg.devDependencies?.typescript).toBe("^5.0.0");
  });

  it("does nothing when no package.json exists", () => {
    // no package.json written
    expect(() => updatePackageVersions(testDir, { addfox: "0.2.2" })).not.toThrow();
  });

  it("does nothing when versions are null and addfox/utils are not present", () => {
    writePkg({ dependencies: { react: "^18.0.0" } });
    updatePackageVersions(testDir, { addfox: null, utils: null });
    const pkg = readPkg();
    expect(pkg.dependencies?.react).toBe("^18.0.0");
    expect(pkg.dependencies?.addfox).toBeUndefined();
  });
});

describe("resolveLatestVersion", () => {
  it("resolves a real package version from npm registry", () => {
    const version = resolveLatestVersion("addfox");
    expect(version).not.toBeNull();
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
  });

  it("returns null for a non-existent package", () => {
    const version = resolveLatestVersion("this-package-definitely-does-not-exist-12345");
    expect(version).toBeNull();
  });
});
