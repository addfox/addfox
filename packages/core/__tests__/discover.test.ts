import path from "path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "@rstest/core";
import {
  discoverEntries,
  getHtmlEntryNames,
  getScriptOnlyEntryNames,
} from "../src/entry/discoverer.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtureDir = path.join(__dirname, "fixtures", "entry-discovery");

describe("EntryDiscoverer", () => {
  describe("getHtmlEntryNames", () => {
    it("returns html built-in entries including sandbox and chrome override pages", () => {
      expect(getHtmlEntryNames()).toEqual([
        "popup",
        "options",
        "sidepanel",
        "devtools",
        "offscreen",
        "sandbox",
        "newtab",
        "bookmarks",
        "history",
      ]);
    });
  });

  describe("getScriptOnlyEntryNames", () => {
    it("returns background, content", () => {
      expect(getScriptOnlyEntryNames()).toEqual(["background", "content"]);
    });
  });

  describe("discover", () => {
    it("finds background and devtools entries in fixture dir", () => {
      const entries = discoverEntries(fixtureDir);
      const names = entries.map((e) => e.name).sort();
      expect(names).toContain("background");
      expect(names).toContain("devtools");
      const bg = entries.find((e) => e.name === "background");
      const dev = entries.find((e) => e.name === "devtools");
      expect(bg?.scriptPath).toMatch(/background[\\/]index\.ts$/);
      expect(bg?.htmlPath).toBeUndefined();
      expect(dev?.scriptPath).toMatch(/devtools[\\/]index\.ts$/);
      expect(dev?.htmlPath).toMatch(/devtools[\\/]index\.html$/);
    });

    it("returns empty array for dir with no entry subdirs", () => {
      const entries = discoverEntries(path.join(__dirname, "fixtures"));
      expect(entries).toEqual([]);
    });

    it("returns empty array for non-existent directory (null baseContents)", () => {
      const entries = discoverEntries("/nonexistent/path/that/does/not/exist");
      expect(entries).toEqual([]);
    });

    it("finds html-only entry when data-addfox-entry script exists", () => {
      const entries = discoverEntries(fixtureDir);
      const sidepanel = entries.find((e) => e.name === "sidepanel");
      expect(sidepanel).toBeDefined();
      expect(sidepanel?.htmlPath).toMatch(/sidepanel[\\/]index\.html$/);
      expect(sidepanel?.scriptPath).toMatch(/sidepanel[\\/]main\.ts$/);
      expect(sidepanel?.scriptInject).toBe("body");
    });

    it("skips path that is file not directory", async () => {
      const { mkdirSync, writeFileSync, rmSync } = await import("fs");
      const { join } = await import("path");
      const { tmpdir } = await import("os");
      const dir = join(tmpdir(), `addfox-discover-${Date.now()}`);
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, "background"), "file not dir", "utf-8");
      
      const entries = discoverEntries(dir);
      expect(entries).toEqual([]);
      rmSync(dir, { recursive: true, force: true });
    });

    it("finds script-only entry as single file at base (e.g. background.js)", async () => {
      const { mkdirSync, writeFileSync, rmSync } = await import("fs");
      const { join } = await import("path");
      const { tmpdir } = await import("os");
      const dir = join(tmpdir(), `addfox-discover-single-${Date.now()}`);
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, "background.js"), "// script", "utf-8");
      
      const entries = discoverEntries(dir);
      expect(entries.some((e) => e.name === "background")).toBe(true);
      expect(entries.find((e) => e.name === "background")?.htmlPath).toBeUndefined();
      rmSync(dir, { recursive: true, force: true });
    });

    it("finds html entry as single files at base (popup.html + popup.ts)", async () => {
      const { mkdirSync, writeFileSync, rmSync } = await import("fs");
      const { join } = await import("path");
      const { tmpdir } = await import("os");
      const dir = join(tmpdir(), `addfox-discover-html-single-${Date.now()}`);
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, "popup.html"), "<html></html>", "utf-8");
      writeFileSync(join(dir, "popup.ts"), "// script", "utf-8");
      
      const entries = discoverEntries(dir);
      const popup = entries.find((e) => e.name === "popup");
      expect(popup).toBeDefined();
      expect(popup?.scriptPath).toMatch(/popup\.ts$/);
      expect(popup?.htmlPath).toMatch(/popup\.html$/);
      rmSync(dir, { recursive: true, force: true });
    });

    it("finds chrome override html entries at base (newtab/bookmarks/history)", async () => {
      const { mkdirSync, writeFileSync, rmSync } = await import("fs");
      const { join } = await import("path");
      const { tmpdir } = await import("os");
      const dir = join(tmpdir(), `addfox-discover-overrides-${Date.now()}`);
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, "newtab.html"), "<html></html>", "utf-8");
      writeFileSync(join(dir, "newtab.ts"), "// script", "utf-8");
      writeFileSync(join(dir, "bookmarks.html"), "<html></html>", "utf-8");
      writeFileSync(join(dir, "bookmarks.ts"), "// script", "utf-8");
      writeFileSync(join(dir, "history.html"), "<html></html>", "utf-8");
      writeFileSync(join(dir, "history.ts"), "// script", "utf-8");
      
      const entries = discoverEntries(dir);
      expect(entries.find((e) => e.name === "newtab")?.htmlPath).toMatch(/newtab\.html$/);
      expect(entries.find((e) => e.name === "bookmarks")?.htmlPath).toMatch(/bookmarks\.html$/);
      expect(entries.find((e) => e.name === "history")?.htmlPath).toMatch(/history\.html$/);
      rmSync(dir, { recursive: true, force: true });
    });

    it("throws when script from data-addfox-entry does not exist (singleHtml)", async () => {
      const { mkdirSync, writeFileSync, rmSync } = await import("fs");
      const { join } = await import("path");
      const { tmpdir } = await import("os");
      const { AddfoxError, ADDFOX_ERROR_CODES } = await import("@addfox/common");
      const dir = join(tmpdir(), `addfox-discover-html-only-${Date.now()}`);
      mkdirSync(dir, { recursive: true });
      writeFileSync(
        join(dir, "popup.html"),
        '<html><script data-addfox-entry src="./popup.ts"></script></html>',
        "utf-8"
      );
      
      let err: unknown;
      try {
        discoverEntries(dir);
      } catch (e) {
        err = e;
      }
      expect(err).toBeDefined();
      expect(err).toBeInstanceOf(AddfoxError);
      expect((err as AddfoxError).code).toBe(ADDFOX_ERROR_CODES.ENTRY_SCRIPT_FROM_HTML);
      rmSync(dir, { recursive: true, force: true });
    });

    it("finds html entry from singleHtml when script from HTML exists (resolved branch)", async () => {
      const { mkdirSync, writeFileSync, rmSync } = await import("fs");
      const { join } = await import("path");
      const { tmpdir } = await import("os");
      const dir = join(tmpdir(), `addfox-discover-single-html-resolved-${Date.now()}`);
      mkdirSync(dir, { recursive: true });
      writeFileSync(
        join(dir, "popup.html"),
        '<html><script data-addfox-entry src="./main.ts"></script></html>',
        "utf-8"
      );
      writeFileSync(join(dir, "main.ts"), "// entry", "utf-8");
      
      const entries = discoverEntries(dir);
      const popup = entries.find((e) => e.name === "popup");
      expect(popup).toBeDefined();
      expect(popup?.scriptPath).toMatch(/main\.ts$/);
      expect(popup?.htmlPath).toMatch(/popup\.html$/);
      expect(popup?.scriptInject).toBe("body");
      rmSync(dir, { recursive: true, force: true });
    });

    it("returns html entry with scriptInject undefined when subdir has script but no index.html", async () => {
      const { mkdirSync, writeFileSync, rmSync } = await import("fs");
      const { join } = await import("path");
      const { tmpdir } = await import("os");
      const dir = join(tmpdir(), `addfox-discover-script-no-html-${Date.now()}`);
      mkdirSync(join(dir, "popup"), { recursive: true });
      writeFileSync(join(dir, "popup", "index.ts"), "// entry", "utf-8");
      
      const entries = discoverEntries(dir);
      const popup = entries.find((e) => e.name === "popup");
      expect(popup).toBeDefined();
      expect(popup?.html).toBe(true);
      expect(popup?.scriptInject).toBeUndefined();
      expect(popup?.htmlPath).toBeUndefined();
      rmSync(dir, { recursive: true, force: true });
    });

    it("throws when data-addfox-entry points to unsupported script extension in subdir", async () => {
      const { mkdirSync, writeFileSync, rmSync } = await import("fs");
      const { join } = await import("path");
      const { tmpdir } = await import("os");
      const { AddfoxError } = await import("@addfox/common");
      const dir = join(tmpdir(), `addfox-discover-bad-ext-${Date.now()}`);
      mkdirSync(join(dir, "popup"), { recursive: true });
      writeFileSync(
        join(dir, "popup", "index.html"),
        '<html><script data-addfox-entry src="./main.css"></script></html>',
        "utf-8"
      );
      writeFileSync(join(dir, "popup", "main.css"), "body{}", "utf-8");
      
      let err: unknown;
      try {
        discoverEntries(dir);
      } catch (e) {
        err = e;
      }
      expect(err).toBeDefined();
      expect(err).toBeInstanceOf(AddfoxError);
      rmSync(dir, { recursive: true, force: true });
    });

    it("falls through to buildHtmlEntryInfo when subdir has only index.html (no script)", async () => {
      const { mkdirSync, writeFileSync, rmSync } = await import("fs");
      const { join } = await import("path");
      const { tmpdir } = await import("os");
      const dir = join(tmpdir(), `addfox-discover-html-no-script-${Date.now()}`);
      mkdirSync(join(dir, "popup"), { recursive: true });
      writeFileSync(join(dir, "popup", "index.html"), "<html><body>no script</body></html>", "utf-8");
      
      const entries = discoverEntries(dir);
      const popup = entries.find((e) => e.name === "popup");
      expect(popup).toBeUndefined();
      rmSync(dir, { recursive: true, force: true });
    });

    it("skips when singleHtml path is not readable (e.g. dir as popup.html, catch branch)", async () => {
      const { mkdirSync, rmSync } = await import("fs");
      const { join } = await import("path");
      const { tmpdir } = await import("os");
      const dir = join(tmpdir(), `addfox-discover-bad-html-${Date.now()}`);
      mkdirSync(dir, { recursive: true });
      mkdirSync(join(dir, "popup.html"));
      
      const entries = discoverEntries(dir);
      const popup = entries.find((e) => e.name === "popup");
      expect(popup).toBeUndefined();
      rmSync(dir, { recursive: true, force: true });
    });
  });
});
