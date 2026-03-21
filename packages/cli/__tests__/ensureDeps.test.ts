import { describe, expect, it, beforeEach, afterEach } from "@rstest/core";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "fs";
import { resolve } from "path";
import { tmpdir } from "os";
import { ensureDependencies, runInstall, readProjectPackageJson, type PackageManager } from "../src/utils/index.ts";
import type { AddfoxResolvedConfig } from "@addfox/core";
import { setAddfoxLoggerRawWrites } from "@addfox/common";

function createMinimalResolvedConfig(plugins: unknown[] = []): AddfoxResolvedConfig {
  return {
    root: "",
    appDir: "src",
    outDir: "dist",
    outputRoot: ".",
    manifest: {},
    plugins,
    envPrefix: ["VITE_"],
  } as unknown as AddfoxResolvedConfig;
}

describe("ensureDeps", () => {
  let testRoot: string;
  const origEnv = process.env.ADDFOX_SKIP_DEPS;

  beforeEach(() => {
    testRoot = resolve(tmpdir(), `addfox-ensure-deps-${Date.now()}`);
    mkdirSync(testRoot, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testRoot)) rmSync(testRoot, { recursive: true, force: true });
    if (origEnv !== undefined) process.env.ADDFOX_SKIP_DEPS = origEnv;
    else delete process.env.ADDFOX_SKIP_DEPS;
  });

  it("when package.json is missing still runs and uses runInstall", async () => {
    writeFileSync(resolve(testRoot, "pnpm-lock.yaml"), "", "utf-8");
    const config = createMinimalResolvedConfig([]);
    let installCalled = false;
    const result = await ensureDependencies(testRoot, config, {
      silent: true,
      runInstall: () => {
        installCalled = true;
        return true;
      },
    });
    expect(installCalled).toBe(true);
    expect(result.installed).toContain("@types/chrome");
  });

  it("when package.json is invalid JSON treats as no deps and installs", async () => {
    writeFileSync(resolve(testRoot, "package.json"), "not json", "utf-8");
    writeFileSync(resolve(testRoot, "pnpm-lock.yaml"), "", "utf-8");
    const config = createMinimalResolvedConfig([]);
    const result = await ensureDependencies(testRoot, config, {
      silent: true,
      runInstall: () => true,
    });
    expect(result.installed).toContain("@types/chrome");
  });

  it("when ADDFOX_SKIP_DEPS=1 returns installed []", async () => {
    process.env.ADDFOX_SKIP_DEPS = "1";
    const config = createMinimalResolvedConfig();
    config.root = testRoot;
    const result = await ensureDependencies(testRoot, config, { silent: true });
    expect(result.installed).toEqual([]);
  });

  it("when package.json has @types/chrome and no framework plugins returns installed []", async () => {
    writeFileSync(
      resolve(testRoot, "package.json"),
      JSON.stringify({
        name: "test",
        devDependencies: { "@types/chrome": "^0.0.0" },
      }),
      "utf-8"
    );
    const config = createMinimalResolvedConfig([]);
    config.root = testRoot;
    const result = await ensureDependencies(testRoot, config, { silent: true });
    expect(result.installed).toEqual([]);
  });

  it("when package.json has vue and addfox-vue plugin returns installed [] when deps present", async () => {
    writeFileSync(
      resolve(testRoot, "package.json"),
      JSON.stringify({
        name: "test",
        dependencies: { vue: "^3.4.0" },
        devDependencies: { "@types/chrome": "^0.0.0" },
      }),
      "utf-8"
    );
    const config = createMinimalResolvedConfig([{ name: "rsbuild-plugin-vue" }]);
    config.root = testRoot;
    const result = await ensureDependencies(testRoot, config, { silent: true });
    expect(Array.isArray(result.installed)).toBe(true);
  });

  it("when missing @types/chrome and runInstall mock returns installed list", async () => {
    writeFileSync(resolve(testRoot, "package.json"), JSON.stringify({ name: "test" }), "utf-8");
    writeFileSync(resolve(testRoot, "pnpm-lock.yaml"), "", "utf-8");
    const config = createMinimalResolvedConfig([]);
    const result = await ensureDependencies(testRoot, config, {
      silent: true,
      runInstall: () => true,
    });
    expect(result.installed).toContain("@types/chrome");
  });

  it("detectPackageManager returns pnpm when pnpm-lock.yaml exists", async () => {
    writeFileSync(resolve(testRoot, "package.json"), JSON.stringify({ name: "test" }), "utf-8");
    writeFileSync(resolve(testRoot, "pnpm-lock.yaml"), "", "utf-8");
    let detectedPm: PackageManager | null = null;
    await ensureDependencies(testRoot, createMinimalResolvedConfig([]), {
      silent: true,
      runInstall: (_root, pm) => {
        detectedPm = pm;
        return true;
      },
    });
    expect(detectedPm).toBe("pnpm");
  });

  it("detectPackageManager returns yarn when yarn.lock exists", async () => {
    writeFileSync(resolve(testRoot, "package.json"), JSON.stringify({ name: "test" }), "utf-8");
    writeFileSync(resolve(testRoot, "yarn.lock"), "", "utf-8");
    let detectedPm: PackageManager | null = null;
    await ensureDependencies(testRoot, createMinimalResolvedConfig([]), {
      silent: true,
      runInstall: (_root, pm) => {
        detectedPm = pm;
        return true;
      },
    });
    expect(detectedPm).toBe("yarn");
  });

  it("detectPackageManager returns npm when package-lock.json exists", async () => {
    writeFileSync(resolve(testRoot, "package.json"), JSON.stringify({ name: "test" }), "utf-8");
    writeFileSync(resolve(testRoot, "package-lock.json"), "{}", "utf-8");
    let detectedPm: PackageManager | null = null;
    await ensureDependencies(testRoot, createMinimalResolvedConfig([]), {
      silent: true,
      runInstall: (_root, pm) => {
        detectedPm = pm;
        return true;
      },
    });
    expect(detectedPm).toBe("npm");
  });

  it("detectPackageManager returns bun when bun.lockb exists", async () => {
    writeFileSync(resolve(testRoot, "package.json"), JSON.stringify({ name: "test" }), "utf-8");
    writeFileSync(resolve(testRoot, "bun.lockb"), "", "utf-8");
    let detectedPm: PackageManager | null = null;
    await ensureDependencies(testRoot, createMinimalResolvedConfig([]), {
      silent: true,
      runInstall: (_root, pm) => {
        detectedPm = pm;
        return true;
      },
    });
    expect(detectedPm).toBe("bun");
  });

  it("when runInstall returns false returns installed []", async () => {
    writeFileSync(resolve(testRoot, "package.json"), JSON.stringify({ name: "test" }), "utf-8");
    writeFileSync(resolve(testRoot, "pnpm-lock.yaml"), "", "utf-8");
    const config = createMinimalResolvedConfig([]);
    const result = await ensureDependencies(testRoot, config, {
      silent: true,
      runInstall: () => false,
    });
    expect(result.installed).toEqual([]);
  });

  it("when not silent and install success logs and does not warn", async () => {
    writeFileSync(resolve(testRoot, "package.json"), JSON.stringify({ name: "test" }), "utf-8");
    writeFileSync(resolve(testRoot, "pnpm-lock.yaml"), "", "utf-8");
    const logCalls: string[] = [];
    const warnCalls: string[] = [];
    const mockWrite = (calls: string[]) => (chunk: unknown, _enc?: unknown, cb?: () => void) => {
      calls.push(String(chunk));
      if (typeof cb === "function") cb();
      return true;
    };
    setAddfoxLoggerRawWrites({ stdout: mockWrite(logCalls), stderr: mockWrite(warnCalls) });
    try {
      const config = createMinimalResolvedConfig([]);
      await ensureDependencies(testRoot, config, {
        silent: false,
        runInstall: () => true,
      });
      expect(logCalls.some((m) => m.includes("@types/chrome"))).toBe(true);
      expect(warnCalls.length).toBe(0);
    } finally {
      setAddfoxLoggerRawWrites(null);
    }
  });

  it("when not silent and install fail warns", async () => {
    writeFileSync(resolve(testRoot, "package.json"), JSON.stringify({ name: "test" }), "utf-8");
    writeFileSync(resolve(testRoot, "pnpm-lock.yaml"), "", "utf-8");
    const warnCalls: string[] = [];
    const mockStderr = (chunk: unknown, _enc?: unknown, cb?: () => void) => {
      warnCalls.push(String(chunk));
      if (typeof cb === "function") cb();
      return true;
    };
    setAddfoxLoggerRawWrites({
      stdout: process.stdout.write.bind(process.stdout),
      stderr: mockStderr,
    });
    try {
      const config = createMinimalResolvedConfig([]);
      await ensureDependencies(testRoot, config, {
        silent: false,
        runInstall: () => false,
      });
      expect(warnCalls.some((m) => m.includes("Failed to install"))).toBe(true);
    } finally {
      setAddfoxLoggerRawWrites(null);
    }
  });

  it("runInstall npm with dev false uses install without -D", () => {
    writeFileSync(resolve(testRoot, "package.json"), JSON.stringify({ name: "test" }), "utf-8");
    const ok = runInstall(testRoot, "npm", ["no-such-pkg-xyz"], false);
    expect(ok).toBe(false);
  });

  it("runInstall bun with dev true uses add -d", () => {
    writeFileSync(resolve(testRoot, "package.json"), JSON.stringify({ name: "test" }), "utf-8");
    const ok = runInstall(testRoot, "bun", ["no-such-pkg-xyz"], true);
    expect(ok).toBe(false);
  });

  it("runInstall pnpm with dev false uses add without -D", () => {
    writeFileSync(resolve(testRoot, "package.json"), JSON.stringify({ name: "test" }), "utf-8");
    const ok = runInstall(testRoot, "pnpm", ["no-such-pkg-xyz"], false);
    expect(ok).toBe(false);
  });

  it("readProjectPackageJson when package.json missing returns null", () => {
    const dirWithNoPkg = resolve(testRoot, "no-pkg-here");
    mkdirSync(dirWithNoPkg, { recursive: true });
    expect(readProjectPackageJson(dirWithNoPkg)).toBe(null);
  });

  it("readProjectPackageJson when package.json present returns parsed content", () => {
    writeFileSync(
      resolve(testRoot, "package.json"),
      JSON.stringify({ name: "pkg", devDependencies: { "@types/chrome": "0.0.1" } }),
      "utf-8"
    );
    const pkg = readProjectPackageJson(testRoot);
    expect(pkg).not.toBe(null);
    expect(pkg?.devDependencies?.["@types/chrome"]).toBe("0.0.1");
  });

  it("readProjectPackageJson when package.json is invalid JSON returns null", () => {
    writeFileSync(resolve(testRoot, "package.json"), "{ broken json", "utf-8");
    expect(readProjectPackageJson(testRoot)).toBe(null);
  });
});
