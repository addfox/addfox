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
