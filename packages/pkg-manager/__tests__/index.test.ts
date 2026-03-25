import { describe, expect, it, beforeEach, afterEach } from "@rstest/core";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { tmpdir } from "node:os";
import {
  detectPackageManager,
  detectFromLockfile,
  getInstallCommand,
  getRunCommand,
  getExecCommand,
  getAddCommand,
  isPackageInstalled,
  getMissingPackages,
} from "../src/index.ts";

describe("detectPackageManager", () => {
  it("returns pnpm for pnpm user agent", () => {
    expect(detectPackageManager("pnpm/9.0.0 node/v20.0.0")).toBe("pnpm");
  });
  it("returns npm for npm user agent", () => {
    expect(detectPackageManager("npm/10.0.0 node/v20.0.0")).toBe("npm");
  });
  it("returns yarn for yarn user agent", () => {
    expect(detectPackageManager("yarn/4.0.0 node/v20.0.0")).toBe("yarn");
  });
  it("returns bun for bun user agent", () => {
    expect(detectPackageManager("bun/1.0.0")).toBe("bun");
  });
  it("falls back to npm for empty string", () => {
    expect(detectPackageManager("")).toBe("npm");
  });
  it("falls back to npm for unknown agent", () => {
    expect(detectPackageManager("unknown/1.0")).toBe("npm");
  });

  it("uses process.env.npm_config_user_agent when no argument provided", () => {
    const original = process.env.npm_config_user_agent;
    process.env.npm_config_user_agent = "pnpm/9.0.0";
    const { detectPackageManager: detect } = require("../src/index.ts");
    expect(detect()).toBe("pnpm");
    process.env.npm_config_user_agent = original;
  });
});

describe("getInstallCommand", () => {
  it("returns correct command for each PM", () => {
    expect(getInstallCommand("pnpm")).toBe("pnpm install");
    expect(getInstallCommand("npm")).toBe("npm install");
    expect(getInstallCommand("yarn")).toBe("yarn");
    expect(getInstallCommand("bun")).toBe("bun install");
  });
});

describe("getRunCommand", () => {
  it("returns correct run command for each PM", () => {
    expect(getRunCommand("pnpm", "dev")).toBe("pnpm dev");
    expect(getRunCommand("npm", "dev")).toBe("npm run dev");
    expect(getRunCommand("yarn", "dev")).toBe("yarn dev");
    expect(getRunCommand("bun", "dev")).toBe("bun dev");
  });
});

describe("getExecCommand", () => {
  it("returns correct exec command for each PM", () => {
    expect(getExecCommand("pnpm")).toBe("pnpx");
    expect(getExecCommand("npm")).toBe("npx");
    expect(getExecCommand("yarn")).toBe("yarn dlx");
    expect(getExecCommand("bun")).toBe("bunx");
  });
});

describe("detectFromLockfile", () => {
  let testRoot: string;

  beforeEach(() => {
    testRoot = resolve(tmpdir(), `pkg-manager-test-${Date.now()}`);
    mkdirSync(testRoot, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testRoot)) rmSync(testRoot, { recursive: true, force: true });
  });

  it("returns pnpm when pnpm-lock.yaml exists", () => {
    writeFileSync(resolve(testRoot, "pnpm-lock.yaml"), "");
    expect(detectFromLockfile(testRoot)).toBe("pnpm");
  });
  it("returns yarn when yarn.lock exists", () => {
    writeFileSync(resolve(testRoot, "yarn.lock"), "");
    expect(detectFromLockfile(testRoot)).toBe("yarn");
  });
  it("returns npm when package-lock.json exists", () => {
    writeFileSync(resolve(testRoot, "package-lock.json"), "{}");
    expect(detectFromLockfile(testRoot)).toBe("npm");
  });
  it("returns bun when bun.lockb exists", () => {
    writeFileSync(resolve(testRoot, "bun.lockb"), "");
    expect(detectFromLockfile(testRoot)).toBe("bun");
  });
  it("falls back to pnpm when no lockfile found", () => {
    expect(detectFromLockfile(testRoot)).toBe("pnpm");
  });
});

describe("getAddCommand", () => {
  it("returns add command without -D by default", () => {
    expect(getAddCommand("pnpm", "react")).toBe("pnpm add react");
    expect(getAddCommand("npm", "react")).toBe("npm install react");
    expect(getAddCommand("yarn", "react")).toBe("yarn add react");
    expect(getAddCommand("bun", "react")).toBe("bun add react");
  });
  it("returns add command with -D for dev dependencies", () => {
    expect(getAddCommand("pnpm", "typescript", true)).toBe("pnpm add typescript -D");
    expect(getAddCommand("npm", "typescript", true)).toBe("npm install typescript -D");
  });
});

describe("isPackageInstalled", () => {
  let testRoot: string;

  beforeEach(() => {
    testRoot = resolve(tmpdir(), `pkg-installed-test-${Date.now()}`);
    mkdirSync(testRoot, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testRoot)) rmSync(testRoot, { recursive: true, force: true });
  });

  it("detects package installed even when package.json subpath is not exported", () => {
    const pkgRoot = resolve(testRoot, "node_modules", "virtual-pkg");
    mkdirSync(pkgRoot, { recursive: true });
    writeFileSync(
      resolve(pkgRoot, "package.json"),
      JSON.stringify(
        {
          name: "virtual-pkg",
          version: "1.0.0",
          type: "module",
          exports: {
            ".": "./index.js",
          },
        },
        null,
        2,
      ),
    );
    writeFileSync(resolve(pkgRoot, "index.js"), "export default 1;\n");

    expect(isPackageInstalled(testRoot, "virtual-pkg")).toBe(true);
  });

  it("returns false when package is not installed", () => {
    expect(isPackageInstalled(testRoot, "non-existent-package")).toBe(false);
  });

  it("detects package via package.json subpath when main entry is blocked", () => {
    const pkgRoot = resolve(testRoot, "node_modules", "pkg-json-only");
    mkdirSync(pkgRoot, { recursive: true });
    writeFileSync(
      resolve(pkgRoot, "package.json"),
      JSON.stringify({
        name: "pkg-json-only",
        version: "1.0.0",
        exports: {
          "./package.json": "./package.json",
        },
      }),
    );

    expect(isPackageInstalled(testRoot, "pkg-json-only")).toBe(true);
  });
});

describe("getMissingPackages", () => {
  let testRoot: string;

  beforeEach(() => {
    testRoot = resolve(tmpdir(), `pkg-missing-test-${Date.now()}`);
    mkdirSync(testRoot, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testRoot)) rmSync(testRoot, { recursive: true, force: true });
  });

  it("returns empty array when all packages are installed", () => {
    const pkgRoot = resolve(testRoot, "node_modules", "installed-pkg");
    mkdirSync(pkgRoot, { recursive: true });
    writeFileSync(
      resolve(pkgRoot, "package.json"),
      JSON.stringify({ name: "installed-pkg", version: "1.0.0" }),
    );
    writeFileSync(resolve(pkgRoot, "index.js"), "module.exports = 1;\n");

    expect(getMissingPackages(testRoot, ["installed-pkg"])).toEqual([]);
  });

  it("returns package names that are not installed", () => {
    expect(getMissingPackages(testRoot, ["missing-pkg-1", "missing-pkg-2"])).toEqual([
      "missing-pkg-1",
      "missing-pkg-2",
    ]);
  });

  it("returns only missing packages when some are installed", () => {
    const pkgRoot = resolve(testRoot, "node_modules", "installed-pkg");
    mkdirSync(pkgRoot, { recursive: true });
    writeFileSync(
      resolve(pkgRoot, "package.json"),
      JSON.stringify({ name: "installed-pkg", version: "1.0.0" }),
    );
    writeFileSync(resolve(pkgRoot, "index.js"), "module.exports = 1;\n");

    expect(getMissingPackages(testRoot, ["installed-pkg", "missing-pkg"])).toEqual(["missing-pkg"]);
  });
});
