import { describe, expect, it, afterEach } from "@rstest/core";
import { mkdirSync, writeFileSync, existsSync, rmSync } from "fs";
import { resolve } from "path";
import { tmpdir } from "os";
import { getBrowserPath, launchBrowser, cleanup } from "../src/index.ts";

describe("getBrowserPath with browserConfig", () => {
  it("browser.<name>.path wins over legacy browserPath options", () => {
    const p = getBrowserPath("chrome", { chromePath: "/legacy/chrome" }, { chrome: { path: "/new/chrome" } });
    expect(p).toBe("/new/chrome");
  });

  it("falls back to legacy path options when browserConfig path is blank", () => {
    const p = getBrowserPath("chrome", { chromePath: "/legacy/chrome" }, { chrome: { path: "  " } });
    expect(p).toBe("/legacy/chrome");
  });

  it("falls back to legacy path options when browserConfig is absent", () => {
    expect(getBrowserPath("chrome", { chromePath: "/legacy/chrome" })).toBe("/legacy/chrome");
  });
});

describe("launchBrowser profile handling", () => {
  let dirs: string[] = [];

  function makeDir(tag: string): string {
    const d = resolve(tmpdir(), `addfox-launch-${tag}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
    mkdirSync(d, { recursive: true });
    dirs.push(d);
    return d;
  }

  afterEach(async () => {
    await cleanup().catch(() => {});
    for (const d of dirs) rmSync(d, { recursive: true, force: true });
    dirs = [];
  });

  function fakeRunner(captured: { userDataDir?: string }) {
    return async (opts: { userDataDir?: string }) => {
      captured.userDataDir = opts.userDataDir;
      return { exit: async () => {} };
    };
  }

  /** Default profile dir for a distPath: <distPath>/../cache/browser-profile/<browser>-user-data */
  function defaultProfileDir(distPath: string, browser: string): string {
    return resolve(distPath, "..", "cache", "browser-profile", `${browser}-user-data`);
  }

  it("uses browserConfig.profile as user-data dir, resolved against project root", async () => {
    const root = makeDir("root");
    const distPath = resolve(makeDir("proj"), "x", "dist");
    mkdirSync(distPath, { recursive: true });
    const captured: { userDataDir?: string } = {};
    await launchBrowser(
      {
        distPath,
        browser: "chrome",
        enableReload: false,
        root,
        keepBrowserProfile: true,
        browserConfig: { chrome: { profile: "my-profile" } },
      },
      fakeRunner(captured),
      async () => true,
      () => "/fake/chrome.exe"
    );
    expect(captured.userDataDir).toBe(resolve(root, "my-profile"));
  });

  it("wipes the previous profile when keepBrowserProfile is false (default)", async () => {
    const distPath = resolve(makeDir("proj"), "x", "dist");
    mkdirSync(distPath, { recursive: true });
    const profileDir = defaultProfileDir(distPath, "chrome");
    mkdirSync(profileDir, { recursive: true });
    writeFileSync(resolve(profileDir, "marker.txt"), "1", "utf-8");
    const captured: { userDataDir?: string } = {};
    await launchBrowser(
      { distPath, browser: "chrome", enableReload: false },
      fakeRunner(captured),
      async () => true,
      () => "/fake/chrome.exe"
    );
    expect(captured.userDataDir).toBe(profileDir);
    expect(existsSync(resolve(profileDir, "marker.txt"))).toBe(false);
  });

  it("keeps the previous profile when keepBrowserProfile is true", async () => {
    const distPath = resolve(makeDir("proj"), "x", "dist");
    mkdirSync(distPath, { recursive: true });
    const profileDir = defaultProfileDir(distPath, "chrome");
    mkdirSync(profileDir, { recursive: true });
    writeFileSync(resolve(profileDir, "marker.txt"), "1", "utf-8");
    await launchBrowser(
      { distPath, browser: "chrome", enableReload: false, keepBrowserProfile: true },
      fakeRunner({}),
      async () => true,
      () => "/fake/chrome.exe"
    );
    expect(existsSync(resolve(profileDir, "marker.txt"))).toBe(true);
  });

  it("deprecated cache option still keeps the profile (fallback)", async () => {
    const distPath = resolve(makeDir("proj"), "x", "dist");
    mkdirSync(distPath, { recursive: true });
    const profileDir = defaultProfileDir(distPath, "chrome");
    mkdirSync(profileDir, { recursive: true });
    writeFileSync(resolve(profileDir, "marker.txt"), "1", "utf-8");
    await launchBrowser(
      { distPath, browser: "chrome", enableReload: false, cache: true },
      fakeRunner({}),
      async () => true,
      () => "/fake/chrome.exe"
    );
    expect(existsSync(resolve(profileDir, "marker.txt"))).toBe(true);
  });
});
