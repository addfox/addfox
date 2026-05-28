import { describe, expect, it, beforeEach, afterEach } from "@rstest/core";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "fs";
import { resolve } from "path";
import { tmpdir } from "os";
import { ADDFOX_OUTPUT_ROOT } from "@addfox/core";
import { zipDist, type ZipDistDeps } from "../src/utils/index.ts";

describe("zipDist", () => {
  let testRoot: string;
  let distPath: string;
  const outDir = "dist";
  const zipDir = ADDFOX_OUTPUT_ROOT;

  beforeEach(() => {
    testRoot = resolve(tmpdir(), `addfox-zip-${Date.now()}`);
    distPath = resolve(testRoot, outDir);
    mkdirSync(distPath, { recursive: true });
    writeFileSync(resolve(distPath, "manifest.json"), "{}", "utf-8");
  });

  afterEach(() => {
    if (existsSync(testRoot)) rmSync(testRoot, { recursive: true, force: true });
    const zipPath = resolve(testRoot, zipDir, outDir, `${outDir}.zip`);
    if (existsSync(zipPath)) rmSync(zipPath, { force: true });
  });

  it("resolves with zip path under .addfox/<outDir> with default filename", async () => {
    const zipPath = await zipDist(distPath, testRoot, outDir);
    expect(zipPath).toBe(resolve(testRoot, zipDir, outDir, `${outDir}.zip`));
    expect(existsSync(zipPath)).toBe(true);
  });

  it("resolves with browser-specific zip path when browser is provided", async () => {
    const zipPath = await zipDist(distPath, testRoot, outDir, "chromium");
    expect(zipPath).toBe(resolve(testRoot, zipDir, outDir, `${outDir}-chromium.zip`));
    expect(existsSync(zipPath)).toBe(true);
  });

  it("resolves with firefox-specific zip path for firefox browser", async () => {
    const zipPath = await zipDist(distPath, testRoot, outDir, "firefox");
    expect(zipPath).toBe(resolve(testRoot, zipDir, outDir, `${outDir}-firefox.zip`));
    expect(existsSync(zipPath)).toBe(true);
  });

  it("zip file exists and is non-empty", async () => {
    const zipPath = await zipDist(distPath, testRoot, outDir);
    const stat = await import("fs/promises").then((fs) => fs.stat(zipPath));
    expect(stat.size).toBeGreaterThan(0);
  });

  it("rejects with AddfoxError when output stream errors (Error instance)", async () => {
    const { PassThrough } = await import("stream");
    const deps: ZipDistDeps = {
      createWriteStream: () => {
        const s = new PassThrough();
        setImmediate(() => s.emit("error", new Error("write failed")));
        return s as never;
      },
    };
    await expect(zipDist(distPath, testRoot, outDir, undefined, deps)).rejects.toThrow("Zip output stream failed");
  });

  it("rejects with AddfoxError when output stream errors (non-Error)", async () => {
    const { PassThrough } = await import("stream");
    const deps: ZipDistDeps = {
      createWriteStream: () => {
        const s = new PassThrough();
        setImmediate(() => s.emit("error", "string error"));
        return s as never;
      },
    };
    await expect(zipDist(distPath, testRoot, outDir, undefined, deps)).rejects.toThrow("Zip output stream failed");
  });

  it("rejects with AddfoxError when zipDirectory errors (Error instance)", async () => {
    const deps: ZipDistDeps = {
      zipDirectory: async () => {
        throw new Error("archive failed");
      },
    };
    await expect(zipDist(distPath, testRoot, outDir, undefined, deps)).rejects.toThrow("Zip archive failed");
  });

  it("rejects when zipDirectory errors with non-Error", async () => {
    const deps: ZipDistDeps = {
      zipDirectory: async () => {
        throw "string err";
      },
    };
    await expect(zipDist(distPath, testRoot, outDir, undefined, deps)).rejects.toThrow("Zip archive failed");
  });
});
