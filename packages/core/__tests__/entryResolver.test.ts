import path from "path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "@rstest/core";
import { resolveEntries } from "../src/entry/resolver.ts";
import type { ManifestRecord } from "../src/types.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtureDir = path.join(__dirname, "fixtures", "entry-discovery");

describe("EntryResolver", () => {
  describe("resolve with no entry config", () => {
    it("delegates to discover and returns discovered entries", () => {
      const result = resolveEntries({}, "/root", fixtureDir);
      const names = result.entries.map((e) => e.name).sort();
      expect(names).toContain("background");
      expect(names).toContain("devtools");
    });

    it("returns manifest replacement map when manifest has source paths", () => {
      const manifest: ManifestRecord = {
        name: "Test",
        version: "1.0",
        manifest_version: 3,
        background: {
          service_worker: "./background/index.ts",
        },
      };

      const result = resolveEntries({}, "/root", fixtureDir, manifest);
      
      expect(result.manifestReplacementMap).toBeDefined();
      expect(result.manifestReplacementMap?.get("background.service_worker")).toBe("background");
    });
  });

  describe("resolve with empty entry config", () => {
    it("delegates to discover", () => {
      const result = resolveEntries({ entry: {} }, "/root", fixtureDir);
      expect(result.entries.length).toBeGreaterThan(0);
    });

    it("uses manifest entries when entry config is empty", () => {
      const manifest: ManifestRecord = {
        name: "Test",
        version: "1.0",
        manifest_version: 3,
        background: {
          service_worker: "./background/index.ts",
        },
      };

      const result = resolveEntries({ entry: {} }, "/root", fixtureDir, manifest);
      
      const bg = result.entries.find((e) => e.name === "background");
      expect(bg).toBeDefined();
    });
  });

  describe("resolve with entry config", () => {
    it("uses entry paths when files exist", () => {
      const result = resolveEntries(
        { entry: { background: "background/index.ts", devtools: "devtools/index.ts" } },
        "/root",
        fixtureDir
      );
      expect(result.entries.find((e) => e.name === "background")?.scriptPath).toMatch(/background[\\/]index\.ts$/);
      expect(result.entries.find((e) => e.name === "devtools")?.scriptPath).toMatch(/devtools[\\/]index\.ts$/);
      expect(result.entries.length).toBeGreaterThanOrEqual(2);
    });

    it("config.entry has higher priority than manifest", () => {
      const manifest: ManifestRecord = {
        name: "Test",
        version: "1.0",
        manifest_version: 3,
        background: {
          service_worker: "./background/index.ts",
        },
      };

      const result = resolveEntries(
        { entry: { background: "devtools/index.ts" } },  // use devtools dir as background
        "/root",
        fixtureDir,
        manifest
      );
      
      const bg = result.entries.find((e) => e.name === "background");
      expect(bg?.scriptPath).toMatch(/devtools[\\/]index\.ts$/);
    });

    it("skips non-existent paths and falls back to discover when none exist", () => {
      const emptyDir = path.join(__dirname, "fixtures");
      const result = resolveEntries(
        { entry: { background: "nonexistent/index.ts" } },
        "/root",
        emptyDir
      );
      expect(result.entries).toEqual([]);
    });

    it("resolves html path and finds script in same dir", () => {
      const result = resolveEntries(
        { entry: { popup: "popup/index.html" } },
        "/root",
        fixtureDir
      );
      const popupEntry = result.entries.find((e) => e.name === "popup");
      expect(popupEntry).toBeDefined();
      expect(popupEntry?.htmlPath).toMatch(/popup[\\/]index\.html$/);
      expect(popupEntry?.scriptPath).toMatch(/popup[\\/]index\.ts$/);
    });

    it("resolves script path and infers htmlPath for popup when index.html exists", () => {
      const result = resolveEntries(
        { entry: { popup: "popup/index.ts" } },
        "/root",
        fixtureDir
      );
      const popupEntry = result.entries.find((e) => e.name === "popup");
      expect(popupEntry).toBeDefined();
      expect(popupEntry?.htmlPath).toMatch(/popup[\\/]index\.html$/);
    });

    it("resolves script path and infers htmlPath for newtab when index.html exists", async () => {
      const { mkdirSync, writeFileSync, rmSync } = await import("fs");
      const { join } = await import("path");
      const { tmpdir } = await import("os");
      const baseDir = join(tmpdir(), `addfox-entry-newtab-${Date.now()}`);
      mkdirSync(join(baseDir, "newtab"), { recursive: true });
      writeFileSync(join(baseDir, "newtab", "index.ts"), "// script", "utf-8");
      writeFileSync(join(baseDir, "newtab", "index.html"), "<html></html>", "utf-8");
      const result = resolveEntries(
        { entry: { newtab: "newtab/index.ts" } },
        "/root",
        baseDir
      );
      const newtabEntry = result.entries.find((e) => e.name === "newtab");
      expect(newtabEntry).toBeDefined();
      expect(newtabEntry?.htmlPath).toMatch(/newtab[\\/]index\.html$/);
      rmSync(baseDir, { recursive: true, force: true });
    });

    it("resolves script path and infers htmlPath for sandbox when index.html exists", async () => {
      const { mkdirSync, writeFileSync, rmSync } = await import("fs");
      const { join } = await import("path");
      const { tmpdir } = await import("os");
      const baseDir = join(tmpdir(), `addfox-entry-sandbox-${Date.now()}`);
      mkdirSync(join(baseDir, "sandbox"), { recursive: true });
      writeFileSync(join(baseDir, "sandbox", "index.ts"), "// script", "utf-8");
      writeFileSync(join(baseDir, "sandbox", "index.html"), "<html></html>", "utf-8");
      const result = resolveEntries(
        { entry: { sandbox: "sandbox/index.ts" } },
        "/root",
        baseDir
      );
      const sandboxEntry = result.entries.find((e) => e.name === "sandbox");
      expect(sandboxEntry).toBeDefined();
      expect(sandboxEntry?.htmlPath).toMatch(/sandbox[\\/]index\.html$/);
      rmSync(baseDir, { recursive: true, force: true });
    });

    it("resolves script path without htmlPath for background", () => {
      const result = resolveEntries(
        { entry: { background: "background/index.ts" } },
        "/root",
        fixtureDir
      );
      const bg = result.entries.find((e) => e.name === "background");
      expect(bg?.htmlPath).toBeUndefined();
    });

    it("resolves html path with stem script (not index) when no index in dir", () => {
      const result = resolveEntries(
        { entry: { options: "options/other.html" } },
        "/root",
        fixtureDir
      );
      const optionsEntry = result.entries.find((e) => e.name === "options");
      expect(optionsEntry).toBeDefined();
      expect(optionsEntry?.scriptPath?.endsWith("other.ts")).toBe(true);
    });

    it("returns null for non-script non-html path", async () => {
      const { mkdirSync, writeFileSync, rmSync } = await import("fs");
      const { join } = await import("path");
      const { tmpdir } = await import("os");
      const emptyDir = join(tmpdir(), `addfox-entry-${Date.now()}`);
      mkdirSync(emptyDir, { recursive: true });
      writeFileSync(join(emptyDir, "readme.txt"), "not script or html", "utf-8");
      const result = resolveEntries(
        { entry: { custom: "readme.txt" } },
        "/root",
        emptyDir
      );
      expect(result.entries.some((e) => e.name === "custom")).toBe(false);
      rmSync(emptyDir, { recursive: true, force: true });
    });

    it("finds script via index in dir when html stem has no matching script", () => {
      const baseDir = path.join(__dirname, "fixtures", "entry-discovery");
      const result = resolveEntries(
        { entry: { devtools: "devtools/index.html" } },
        "/root",
        baseDir
      );
      const dev = result.entries.find((e) => e.name === "devtools");
      expect(dev).toBeDefined();
      expect(dev?.scriptPath).toMatch(/devtools[\\/]index\.(ts|js)$/);
      expect(dev?.htmlPath).toMatch(/devtools[\\/]index\.html$/);
    });

    it("resolves html path when path is directory (resolveScriptFromHtml throws, findScriptForHtmlDir used)", async () => {
      const { mkdirSync, writeFileSync, rmSync } = await import("fs");
      const { join } = await import("path");
      const { tmpdir } = await import("os");
      const baseDir = join(tmpdir(), `addfox-entry-html-dir-${Date.now()}`);
      mkdirSync(baseDir, { recursive: true });
      mkdirSync(join(baseDir, "popup.html"));
      writeFileSync(join(baseDir, "popup.ts"), "// script", "utf-8");
      const result = resolveEntries(
        { entry: { popup: "popup.html" } },
        "/root",
        baseDir
      );
      const popup = result.entries.find((e) => e.name === "popup");
      expect(popup).toBeDefined();
      expect(popup?.scriptPath).toMatch(/popup\.ts$/);
      rmSync(baseDir, { recursive: true, force: true });
    });

    it("finds script via findScriptInDir (index) when html stem has no matching script file", () => {
      const baseDir = path.join(__dirname, "fixtures", "entry-discovery");
      const result = resolveEntries(
        { entry: { options: "script-via-index/page.html" } },
        "/root",
        baseDir
      );
      const opt = result.entries.find((e) => e.name === "options");
      expect(opt).toBeDefined();
      expect(opt?.scriptPath).toMatch(/script-via-index[\\/]index\.ts$/);
      expect(opt?.htmlPath).toMatch(/script-via-index[\\/]page\.html$/);
    });

    it("finds script via data-addfox-entry in html template", () => {
      const baseDir = path.join(__dirname, "fixtures", "entry-discovery");
      const result = resolveEntries(
        { entry: { sidepanel: "sidepanel/index.html" } },
        "/root",
        baseDir
      );
      const sidepanel = result.entries.find((e) => e.name === "sidepanel");
      expect(sidepanel).toBeDefined();
      expect(sidepanel?.scriptPath).toMatch(/sidepanel[\\/]main\.ts$/);
      expect(sidepanel?.htmlPath).toMatch(/sidepanel[\\/]index\.html$/);
      expect(sidepanel?.scriptInject).toBe("body");
    });

    it("infers same-dir index.html as template and scriptInject when entry is script path (directory form)", () => {
      const baseDir = path.join(__dirname, "fixtures", "entry-discovery");
      const result = resolveEntries(
        { entry: { sidepanel: "sidepanel/main.ts" } },
        "/root",
        baseDir
      );
      const sidepanel = result.entries.find((e) => e.name === "sidepanel");
      expect(sidepanel).toBeDefined();
      expect(sidepanel?.scriptPath).toMatch(/sidepanel[\\/]main\.ts$/);
      expect(sidepanel?.htmlPath).toMatch(/sidepanel[\\/]index\.html$/);
      expect(sidepanel?.scriptInject).toBe("body");
    });

    it("skips html entry when no script exists in dir", () => {
      const baseDir = path.join(__dirname, "fixtures", "entry-discovery");
      const result = resolveEntries(
        { entry: { popup: "only-html/index.html" } },
        "/root",
        baseDir
      );
      const popup = result.entries.find((e) => e.name === "popup");
      expect(popup).toBeUndefined();
    });

    it("supports object entry config with html flag", () => {
      const result = resolveEntries(
        { entry: { popup: { src: "popup/index.ts", html: true } } },
        "/root",
        fixtureDir
      );
      const popup = result.entries.find((e) => e.name === "popup");
      expect(popup).toBeDefined();
      expect(popup?.scriptPath).toMatch(/popup[\\/]index\.ts$/);
      expect(popup?.html).toBe(true);
    });

    it("supports object entry config with html template path", () => {
      const result = resolveEntries(
        { entry: { popup: { src: "popup/index.ts", html: "popup/index.html" } } },
        "/root",
        fixtureDir
      );
      const popup = result.entries.find((e) => e.name === "popup");
      expect(popup).toBeDefined();
      expect(popup?.htmlPath).toMatch(/popup[\\/]index\.html$/);
      expect(popup?.html).toBe(true);
    });

    it("skips html entry when data-addfox-entry has non-relative src and no body/same-dir script", async () => {
      const { mkdirSync, writeFileSync, rmSync } = await import("fs");
      const { join } = await import("path");
      const { tmpdir } = await import("os");
      const baseDir = join(tmpdir(), `addfox-entry-bad-src-${Date.now()}`);
      mkdirSync(baseDir, { recursive: true });
      writeFileSync(
        join(baseDir, "popup.html"),
        '<html><script data-addfox-entry src="/absolute/path.ts"></script></html>',
        "utf-8"
      );
      const result = resolveEntries({ entry: { popup: "popup.html" } }, "/root", baseDir);
      expect(result.entries.some((e) => e.name === "popup")).toBe(false);
      rmSync(baseDir, { recursive: true, force: true });
    });

    it("skips object entry when src does not exist", () => {
      const result = resolveEntries(
        { entry: { custom: { src: "nonexistent/index.ts" } } },
        "/root",
        fixtureDir
      );
      expect(result.entries.some((e) => e.name === "custom")).toBe(false);
    });

    it("skips object entry when html path does not exist", () => {
      const result = resolveEntries(
        { entry: { popup: { src: "popup/index.ts", html: "nonexistent.html" } } },
        "/root",
        fixtureDir
      );
      expect(result.entries.find((e) => e.name === "popup")?.htmlPath).toBeUndefined();
    });

    it("applies scriptInject when user specifies html template path and it has data-addfox-entry", () => {
      const baseDir = path.join(__dirname, "fixtures", "entry-discovery");
      const result = resolveEntries(
        { entry: { sidepanel: { src: "sidepanel/main.ts", html: "sidepanel/index.html" } } },
        "/root",
        baseDir
      );
      const sidepanel = result.entries.find((e) => e.name === "sidepanel");
      expect(sidepanel).toBeDefined();
      expect(sidepanel?.scriptPath).toMatch(/sidepanel[\\/]main\.ts$/);
      expect(sidepanel?.htmlPath).toMatch(/sidepanel[\\/]index\.html$/);
      expect(sidepanel?.scriptInject).toBe("body");
    });
  });

  describe("priority order", () => {
    it("config.entry > manifest > auto-discovery", () => {
      const manifest: ManifestRecord = {
        name: "Test",
        version: "1.0",
        manifest_version: 3,
        background: {
          service_worker: "./devtools/index.ts",  // path in manifest
        },
      };

      // config.entry should override manifest and auto-discovery
      const result = resolveEntries(
        { entry: { background: "background/index.ts" } },
        "/root",
        fixtureDir,
        manifest
      );

      const bg = result.entries.find((e) => e.name === "background");
      // should use config.entry path
      expect(bg?.scriptPath).toMatch(/background[\\/]index\.ts$/);
    });

    it("manifest > auto-discovery when no config.entry", () => {
      // create a temp dir for the test
      const { mkdirSync, writeFileSync, rmSync } = require("fs");
      const { join } = require("path");
      const { tmpdir } = require("os");
      
      const baseDir = join(tmpdir(), `addfox-manifest-test-${Date.now()}`);
      mkdirSync(join(baseDir, "custom-bg"), { recursive: true });
      writeFileSync(join(baseDir, "custom-bg", "index.ts"), "// custom background", "utf-8");
      
      const manifest: ManifestRecord = {
        name: "Test",
        version: "1.0",
        manifest_version: 3,
        background: {
          service_worker: "./custom-bg/index.ts",  // manifest specifies custom-bg
        },
      };

      // no config.entry, should use manifest
      const result = resolveEntries(
        {},
        "/root",
        baseDir,
        manifest
      );

      const bg = result.entries.find((e) => e.name === "background");
      // should use path from manifest
      expect(bg?.scriptPath).toMatch(/custom-bg[\\/]index\.ts$/);
      
      // cleanup
      rmSync(baseDir, { recursive: true, force: true });
    });

    it("auto-discovery used when no config.entry and no manifest entries", () => {
      const manifest: ManifestRecord = {
        name: "Test",
        version: "1.0",
        manifest_version: 3,
        // no entry source paths specified
      };

      const result = resolveEntries(
        {},
        "/root",
        fixtureDir,
        manifest
      );

      const bg = result.entries.find((e) => e.name === "background");
      // should use auto-discovery
      expect(bg?.scriptPath).toMatch(/background[\\/]index\.ts$/);
    });
  });
});
