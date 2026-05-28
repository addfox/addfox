import { describe, expect, it } from "@rstest/core";
import { resolve } from "path";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "fs";
import { tmpdir } from "os";
import {
  hmrPlugin,
  createHmrRspackPlugin,
  notifyReload,
  getBrowserPath,
  getLaunchPathFromOptions,
  buildDefaultPaths,
  isChromiumBrowser,
  getCacheRoot,
  getBrowserProfileDir,
  getCacheTempRoot,
  getChromiumUserDataDir,
  getReloadManagerPath,
  findExistingReloadManager,
  statsHasErrors,
  launchBrowserOnly,
  ensureDistReady,
  getReloadKindFromDecision,
  isContentChanged,
  getReloadManagerDecision,
  createTestWsServer,
  createReloadManagerExtension,
} from "../src/index.ts";

describe("plugin-extension-hmr", () => {
  it("hmrPlugin returns rsbuild plugin with name rsbuild-plugin-extension-hmr", () => {
    const plugin = hmrPlugin({
      distPath: "/tmp/dist",
      wsPort: 23333,
    });
    expect(plugin.name).toBe("rsbuild-plugin-extension-hmr");
    expect(plugin.setup).toBeDefined();
    expect(typeof plugin.setup).toBe("function");
  });

  it("notifyReload does not throw when no server", () => {
    expect(() => notifyReload("toggle-extension")).not.toThrow();
  });

  it("getLaunchPathFromOptions returns path for each browser", () => {
    const opts = {
      chromePath: "C:\\Chrome\\chrome.exe",
      edgePath: "C:\\Edge\\msedge.exe",
      bravePath: "/usr/bin/brave",
      vivaldiPath: "/usr/bin/vivaldi",
      operaPath: "/usr/bin/opera",
      santaPath: "/usr/bin/santa",
      firefoxPath: "/usr/bin/firefox",
      zenPath: "/usr/bin/zen",
    };
    expect(getLaunchPathFromOptions("chrome", opts)).toBe(opts.chromePath);
    expect(getLaunchPathFromOptions("edge", opts)).toBe(opts.edgePath);
    expect(getLaunchPathFromOptions("brave", opts)).toBe(opts.bravePath);
    expect(getLaunchPathFromOptions("vivaldi", opts)).toBe(opts.vivaldiPath);
    expect(getLaunchPathFromOptions("opera", opts)).toBe(opts.operaPath);
    expect(getLaunchPathFromOptions("santa", opts)).toBe(opts.santaPath);
    expect(getLaunchPathFromOptions("firefox", opts)).toBe(opts.firefoxPath);
    expect(getLaunchPathFromOptions("zen", opts)).toBe(opts.zenPath);
  });

  it("getBrowserPath returns user path when set", () => {
    expect(getBrowserPath("chrome", { chromePath: "  /custom/chrome  " })).toBe("/custom/chrome");
    expect(getBrowserPath("firefox", { firefoxPath: "C:\\ff\\firefox.exe" })).toBe("C:\\ff\\firefox.exe");
    expect(getBrowserPath("zen", { zenPath: "C:\\Zen\\zen.exe" })).toBe("C:\\Zen\\zen.exe");
  });

  it("buildDefaultPaths returns arrays for each browser and platform", () => {
    expect(buildDefaultPaths("chrome", "win32")).toBeDefined();
    expect(Array.isArray(buildDefaultPaths("chrome", "win32"))).toBe(true);
    expect(buildDefaultPaths("edge", "darwin")).toBeDefined();
    expect(buildDefaultPaths("brave", "linux")).toBeDefined();
    expect(buildDefaultPaths("opera", "win32")).toBeDefined();
    expect(buildDefaultPaths("santa", "win32")).toBeDefined();
    expect(buildDefaultPaths("firefox", "linux")).toBeDefined();
    expect(buildDefaultPaths("zen", "win32")).toBeDefined();
  });

  it("buildDefaultPaths vivaldi on win32 with USERPROFILE includes user path", () => {
    const prev = process.env.USERPROFILE;
    process.env.USERPROFILE = "C:\\Users\\Test";
    const paths = buildDefaultPaths("vivaldi", "win32");
    if (prev !== undefined) process.env.USERPROFILE = prev;
    expect(paths).toBeDefined();
    expect(Array.isArray(paths)).toBe(true);
    expect(paths!.some((p) => p.includes("Vivaldi"))).toBe(true);
  });

  it("isChromiumBrowser returns true for chromium browsers", () => {
    expect(isChromiumBrowser("chrome")).toBe(true);
    expect(isChromiumBrowser("edge")).toBe(true);
    expect(isChromiumBrowser("brave")).toBe(true);
    expect(isChromiumBrowser("firefox")).toBe(false);
    expect(isChromiumBrowser("zen")).toBe(false);
  });

  it("getCacheRoot resolves to cache directory", () => {
    const out = getCacheRoot("/proj/.addfox/extension/extension-chromium");
    expect(out).toBe(resolve("/proj/.addfox", "cache"));
  });

  it("getBrowserProfileDir resolves to cache/browser-profile", () => {
    const out = getBrowserProfileDir("/proj/.addfox/extension/extension-chromium");
    expect(out).toBe(resolve("/proj/.addfox", "cache", "browser-profile"));
  });

  it("getCacheTempRoot (deprecated) resolves to cache/browser-profile for backwards compatibility", () => {
    const out = getCacheTempRoot("/proj/.addfox/extension/extension-chromium");
    expect(out).toBe(resolve("/proj/.addfox", "cache", "browser-profile"));
  });

  it("getChromiumUserDataDir and getReloadManagerPath use cache root", () => {
    expect(getChromiumUserDataDir("/proj/dist", "chrome")).toContain("chrome-user-data");
    expect(getReloadManagerPath("/proj/dist")).toContain("reload-manager-extension");
  });

  it("getReloadManagerPath places extension directly under cache root", () => {
    const path = getReloadManagerPath("/proj/.addfox/extension/extension-chromium");
    expect(path).toBe(resolve("/proj/.addfox", "cache", "reload-manager-extension"));
  });

  it("findExistingReloadManager returns null when cache missing", () => {
    const root = resolve(tmpdir(), `hmr-find-${Date.now()}`);
    expect(findExistingReloadManager(root)).toBeNull();
  });

  it("findExistingReloadManager returns path when manifest and bg exist", () => {
    const distPath = resolve(tmpdir(), `hmr-reload-${Date.now()}`);
    const cacheRoot = resolve(distPath, "..", "cache");
    const extPath = resolve(cacheRoot, "reload-manager-extension");
    mkdirSync(extPath, { recursive: true });
    writeFileSync(resolve(extPath, "manifest.json"), "{}", "utf-8");
    writeFileSync(resolve(extPath, "bg.js"), "", "utf-8");
    try {
      expect(findExistingReloadManager(distPath)).toBe(extPath);
    } finally {
      const cacheDir = resolve(distPath, "..", "cache");
      if (existsSync(cacheDir)) rmSync(cacheDir, { recursive: true, force: true });
    }
  });

  it("statsHasErrors returns false for null or non-object", () => {
    expect(statsHasErrors(null)).toBe(false);
    expect(statsHasErrors(undefined)).toBe(false);
    expect(statsHasErrors("string")).toBe(false);
  });

  it("statsHasErrors returns true when hasErrors() is true", () => {
    expect(statsHasErrors({ hasErrors: () => true })).toBe(true);
  });

  it("statsHasErrors returns false when hasErrors is missing or false", () => {
    expect(statsHasErrors({})).toBe(false);
    expect(statsHasErrors({ hasErrors: () => false })).toBe(false);
  });

  it("ensureDistReady throws when manifest missing (short timeout)", async () => {
    const emptyDir = resolve(tmpdir(), `hmr-no-manifest-${Date.now()}`);
    mkdirSync(emptyDir, { recursive: true });
    await expect(ensureDistReady(emptyDir, 400)).rejects.toThrow("dist not ready");
  });

  it("hmrPlugin apply launch tap catch when ensureDistReady throws", async () => {
    const distPath = resolve(tmpdir(), `hmr-catch-${Date.now()}`);
    mkdirSync(distPath, { recursive: true });
    const errLogs: string[] = [];
    const { setAddfoxLoggerRawWrites } = await import("@addfox/common");
    setAddfoxLoggerRawWrites({
      stdout: process.stdout.write.bind(process.stdout),
      stderr: (chunk: unknown) => {
        errLogs.push(String(chunk));
        return true;
      },
    });
    try {
      const plugin = createHmrRspackPlugin(
        {
          distPath,
          autoOpen: true,
          browser: "chrome",
          chromePath: "/fake/chrome.exe",
          wsPort: 23401,
          enableReload: false,
        },
        {
          runChromiumRunner: async () => ({ exit: async () => {} }),
          ensureDistReady: () => {
            throw new Error("injected fail");
          },
        }
      );
      const cbs: Array<(stats: unknown) => void> = [];
      plugin.apply({
        hooks: { done: { tap: (_: string, fn: (s: unknown) => void) => cbs.push(fn) } },
      } as never);
      await cbs[0]!({ hasErrors: () => false });
      expect(errLogs.some((m) => m.includes("Failed to launch browser"))).toBe(true);
    } finally {
      setAddfoxLoggerRawWrites(null);
    }
  });

  it("hmrPlugin apply registers done hook and launch tap", async () => {
    const plugin = createHmrRspackPlugin({
      distPath: resolve(tmpdir(), "hmr-apply-test"),
      wsPort: 23999,
      enableReload: true,
    });
    const launchCbs: Array<(stats: unknown) => void> = [];
    const compiler = {
      hooks: {
        done: {
          tap: (name: string, fn: (stats: unknown) => void) => {
            if (name === "rsbuild-plugin-extension-hmr:launch") launchCbs.push(fn);
          },
        },
      },
    };
    plugin.apply(compiler as never);
    expect(launchCbs.length).toBe(1);
    await launchCbs[0]!({ hasErrors: () => false });
  });

  it("hmrPlugin apply with autoOpen false does not launch", async () => {
    const plugin = createHmrRspackPlugin({
      distPath: resolve(tmpdir(), "hmr-no-open"),
      wsPort: 23998,
      autoOpen: false,
    });
    const cbs: Array<(stats: unknown) => void> = [];
    const compiler = {
      hooks: {
        done: {
          tap: (_name: string, fn: (stats: unknown) => void) => {
            cbs.push(fn);
          },
        },
      },
    };
    plugin.apply(compiler as never);
    await cbs[0]!({ hasErrors: () => false });
  });

  it("hmrPlugin apply returns early when hooks.done missing", () => {
    const plugin = createHmrRspackPlugin({ distPath: "/tmp", wsPort: 23333 });
    const compiler = { hooks: {} };
    expect(() => plugin.apply(compiler as never)).not.toThrow();
  });

  it("hmrPlugin apply launch tap runs launchBrowser with mock runner", async () => {
    const distPath = resolve(tmpdir(), `hmr-launch-${Date.now()}`);
    mkdirSync(distPath, { recursive: true });
    writeFileSync(
      resolve(distPath, "manifest.json"),
      JSON.stringify({ manifest_version: 3, name: "Test", version: "1.0" }),
      "utf-8"
    );
    const mockRunner = async () => ({ exit: async () => {} });
    const plugin = createHmrRspackPlugin(
      {
        distPath,
        autoOpen: true,
        browser: "chrome",
        chromePath: "/fake/chrome.exe",
        wsPort: 23400,
        enableReload: true,
      },
      { runChromiumRunner: mockRunner }
    );
    const cbs: Array<(stats: unknown) => void> = [];
    const compiler = {
      hooks: {
        done: {
          tap: (_name: string, fn: (stats: unknown) => void) => {
            cbs.push(fn);
          },
        },
      },
    };
    plugin.apply(compiler as never);
    await cbs[0]!({ hasErrors: () => false });
    const cacheDir = resolve(distPath, "..", "cache");
    if (existsSync(cacheDir)) rmSync(cacheDir, { recursive: true, force: true });
  });

  it("launchBrowserOnly with mock runner invokes runner (Chromium path)", async () => {
    const distPath = resolve(tmpdir(), `hmr-only-${Date.now()}`);
    mkdirSync(distPath, { recursive: true });
    writeFileSync(
      resolve(distPath, "manifest.json"),
      '{"manifest_version":3,"name":"X"}',
      "utf-8"
    );
    let runnerInvoked = false;
    const mockRunner = async () => {
      runnerInvoked = true;
      return { exit: async () => {} };
    };
    launchBrowserOnly(
      {
        distPath,
        browser: "chrome",
        chromePath: "/fake/chrome.exe",
      },
      mockRunner
    );
    await new Promise((r) => setTimeout(r, 2500));
    expect(runnerInvoked).toBe(true);
    const cacheDir = resolve(distPath, "..", "cache");
    if (existsSync(cacheDir)) rmSync(cacheDir, { recursive: true, force: true });
  });

  it("getReloadKindFromDecision returns toggle-extension when backgroundChanged", () => {
    expect(getReloadKindFromDecision(false, true, false)).toBe("toggle-extension");
    expect(getReloadKindFromDecision(false, true, true)).toBe("toggle-extension");
  });

  it("getReloadKindFromDecision returns toggle-extension-refresh-page when contentChanged and autoRefreshContentPage", () => {
    expect(getReloadKindFromDecision(true, false, true)).toBe("toggle-extension-refresh-page");
  });

  it("getReloadKindFromDecision returns toggle-extension otherwise", () => {
    expect(getReloadKindFromDecision(false, false, false)).toBe("toggle-extension");
    expect(getReloadKindFromDecision(false, false, true)).toBe("toggle-extension");
    expect(getReloadKindFromDecision(true, false, false)).toBe("toggle-extension");
  });

  it("getReloadKindFromDecision keeps content refresh when content and background changed", () => {
    expect(getReloadKindFromDecision(true, true, true)).toBe("toggle-extension-refresh-page");
  });

  it("getReloadKindFromDecision returns toggle-extension when only content changed and autoRefresh off", () => {
    expect(getReloadKindFromDecision(true, false, false)).toBe("toggle-extension");
  });

  it("isContentChanged returns false for null stats", () => {
    expect(isContentChanged(null)).toBe(false);
  });

  it("isContentChanged returns false on first build with content entry", () => {
    const stats = {
      compilation: {
        entrypoints: new Map([
          ["content", { chunks: [{ hash: "content-v1" }] }],
        ]),
      },
    };
    expect(isContentChanged(stats)).toBe(false);
  });

  it("isContentChanged returns true when content hash changes", () => {
    const stats = {
      compilation: {
        entrypoints: new Map([
          ["content", { chunks: [{ hash: "content-v2" }] }],
        ]),
      },
    };
    expect(isContentChanged(stats)).toBe(true);
  });

  it("isContentChanged returns false when content hash is the same", () => {
    const stats = {
      compilation: {
        entrypoints: new Map([
          ["content", { chunks: [{ hash: "content-v2" }] }],
        ]),
      },
    };
    expect(isContentChanged(stats)).toBe(false);
  });

  it("getReloadManagerDecision shouldNotify only when content or background entry output changed", () => {
    const contentBg = (c: string, b: string) => ({
      compilation: {
        entrypoints: new Map([
          ["content", { chunks: [{ hash: c }] }],
          ["background", { chunks: [{ hash: b }] }],
        ]),
      },
    });
    const d1 = getReloadManagerDecision(contentBg("c1", "b1"));
    expect(d1.shouldNotify).toBe(true);
    const d2 = getReloadManagerDecision(contentBg("c1", "b1"));
    expect(d2.shouldNotify).toBe(false);
    const d3 = getReloadManagerDecision(contentBg("c2", "b1"));
    expect(d3.shouldNotify).toBe(true);
    expect(d3.contentChanged).toBe(true);
    expect(d3.backgroundChanged).toBe(false);
    const d4 = getReloadManagerDecision(contentBg("c2", "b2"));
    expect(d4.shouldNotify).toBe(true);
    expect(d4.contentChanged).toBe(false);
    expect(d4.backgroundChanged).toBe(true);
  });

  it("createTestWsServer starts and notifyReload does not throw", async () => {
    const port = 29500 + Math.floor(Math.random() * 500);
    const server = await createTestWsServer(port);
    try {
      expect(() => server.notifyReload()).not.toThrow();
    } finally {
      await server.close();
    }
  });

  it("getBrowserPath falls back to system paths when user path is empty string", () => {
    const result = getBrowserPath("chrome", { chromePath: "" });
    expect(result).not.toBe("");
  });

  it("getBrowserPath falls back to system paths when user path is whitespace only", () => {
    const result = getBrowserPath("chrome", { chromePath: "   " });
    expect(result).not.toBe("   ");
  });

  it("buildDefaultPaths vivaldi on win32 without USERPROFILE returns base paths only", () => {
    const prev = process.env.USERPROFILE;
    delete process.env.USERPROFILE;
    try {
      const paths = buildDefaultPaths("vivaldi", "win32");
      expect(paths).toBeDefined();
      expect(Array.isArray(paths)).toBe(true);
      expect(paths!.every((p) => !p.includes("AppData\\Local"))).toBe(true);
    } finally {
      if (prev !== undefined) process.env.USERPROFILE = prev;
    }
  });

  it("getLaunchPathFromOptions returns undefined when no path is configured", () => {
    expect(getLaunchPathFromOptions("chrome", {})).toBeUndefined();
    expect(getLaunchPathFromOptions("firefox", {})).toBeUndefined();
    expect(getLaunchPathFromOptions("edge", {})).toBeUndefined();
  });

  it("createReloadManagerExtension writes valid MV3 manifest and bg.js for Chromium", async () => {
    const distPath = resolve(tmpdir(), `hmr-rm-${Date.now()}`);
    const wsPort = 23333;
    const extPath = await createReloadManagerExtension(wsPort, distPath, "chrome");
    try {
      expect(existsSync(resolve(extPath, "manifest.json"))).toBe(true);
      expect(existsSync(resolve(extPath, "bg.js"))).toBe(true);
      const manifest = JSON.parse(
        require("fs").readFileSync(resolve(extPath, "manifest.json"), "utf-8")
      );
      expect(manifest.manifest_version).toBe(3);
      expect(manifest.name).toBe("Reload Manager");
      expect(manifest.permissions).toContain("management");
      expect(manifest.permissions).toContain("tabs");
      expect(manifest.permissions).toContain("alarms");
      expect(manifest.background.service_worker).toBe("bg.js");
      const bgJs = require("fs").readFileSync(resolve(extPath, "bg.js"), "utf-8");
      expect(bgJs).toContain("ws://127.0.0.1:" + wsPort);
      expect(bgJs).toContain("chrome.management.getAll");
      expect(bgJs).toContain("chrome.management.setEnabled");
      expect(bgJs).toContain("chrome.alarms");
    } finally {
      const cacheDir = resolve(distPath, "..", "cache");
      if (existsSync(cacheDir)) rmSync(cacheDir, { recursive: true, force: true });
    }
  });

  it("createReloadManagerExtension caches manifest when port and version unchanged", async () => {
    const distPath = resolve(tmpdir(), `hmr-rm-cache-${Date.now()}`);
    const wsPort = 23334;
    const extPath1 = await createReloadManagerExtension(wsPort, distPath);
    const mtime1 = require("fs").statSync(resolve(extPath1, "bg.js")).mtimeMs;
    const extPath2 = await createReloadManagerExtension(wsPort, distPath);
    const mtime2 = require("fs").statSync(resolve(extPath2, "bg.js")).mtimeMs;
    try {
      expect(extPath1).toBe(extPath2);
      expect(mtime1).toBe(mtime2);
    } finally {
      const cacheDir = resolve(distPath, "..", "cache");
      if (existsSync(cacheDir)) rmSync(cacheDir, { recursive: true, force: true });
    }
  });

  it("createReloadManagerExtension regenerates when port changes", async () => {
    const distPath = resolve(tmpdir(), `hmr-rm-regen-${Date.now()}`);
    const extPath1 = await createReloadManagerExtension(23335, distPath);
    const extPath2 = await createReloadManagerExtension(23336, distPath);
    try {
      expect(extPath1).toBe(extPath2);
      const bgJs = require("fs").readFileSync(resolve(extPath2, "bg.js"), "utf-8");
      expect(bgJs).toContain("ws://127.0.0.1:23336");
    } finally {
      const cacheDir = resolve(distPath, "..", "cache");
      if (existsSync(cacheDir)) rmSync(cacheDir, { recursive: true, force: true });
    }
  });

  it("createReloadManagerExtension manifest uses scripts for Firefox", async () => {
    const distPath = resolve(tmpdir(), `hmr-rm-ff-${Date.now()}`);
    const extPath = await createReloadManagerExtension(23337, distPath, "firefox");
    try {
      const manifest = JSON.parse(
        require("fs").readFileSync(resolve(extPath, "manifest.json"), "utf-8")
      );
      expect(manifest.manifest_version).toBe(3);
      expect(Array.isArray(manifest.permissions)).toBe(true);
      expect(manifest.background).toBeDefined();
      expect(manifest.background.scripts).toEqual(["bg.js"]);
      expect(manifest.background.service_worker).toBeUndefined();
    } finally {
      const cacheDir = resolve(distPath, "..", "cache");
      if (existsSync(cacheDir)) rmSync(cacheDir, { recursive: true, force: true });
    }
  });

  it("createReloadManagerExtension manifest uses scripts for Zen", async () => {
    const distPath = resolve(tmpdir(), `hmr-rm-zen-${Date.now()}`);
    const extPath = await createReloadManagerExtension(23338, distPath, "zen");
    try {
      const manifest = JSON.parse(
        require("fs").readFileSync(resolve(extPath, "manifest.json"), "utf-8")
      );
      expect(manifest.background.scripts).toEqual(["bg.js"]);
      expect(manifest.background.service_worker).toBeUndefined();
    } finally {
      const cacheDir = resolve(distPath, "..", "cache");
      if (existsSync(cacheDir)) rmSync(cacheDir, { recursive: true, force: true });
    }
  });

  it("isChromiumBrowser returns false for firefox", () => {
    expect(isChromiumBrowser("firefox")).toBe(false);
    expect(isChromiumBrowser("zen")).toBe(false);
    expect(isChromiumBrowser("chrome")).toBe(true);
    expect(isChromiumBrowser("edge")).toBe(true);
  });
});
