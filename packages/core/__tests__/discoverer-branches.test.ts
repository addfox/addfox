import { describe, it, expect } from "@rstest/core";
import { discoverEntries, getAllEntryNames } from "../src/entry/discoverer.js";
import * as fs from "node:fs";
import * as path from "node:path";
import { tmpdir } from "node:os";

describe("discoverer additional branches", () => {
  describe("getAllEntryNames", () => {
    it("returns combined html and script-only entry names", () => {
      const names = getAllEntryNames();
      expect(names).toContain("popup");
      expect(names).toContain("options");
      expect(names).toContain("background");
      expect(names).toContain("content");
    });

    it("returns custom entry names when provided", () => {
      const names = getAllEntryNames({
        htmlEntryNames: ["custom1"],
        scriptOnlyNames: ["custom2"],
      });
      expect(names).toContain("custom1");
      expect(names).toContain("custom2");
    });
  });

  describe("findScriptInDir return undefined branch", () => {
    it("returns undefined when entry dir has no index script", async () => {
      const dir = fs.mkdtempSync(path.join(tmpdir(), "addfox-no-index-"));
      fs.mkdirSync(path.join(dir, "background"), { recursive: true });
      // Create a file that is not index.ts/js
      fs.writeFileSync(path.join(dir, "background", "other.txt"), "not a script", "utf-8");
      
      const entries = discoverEntries(dir);
      // Should not find background since there's no index.ts/js
      expect(entries.find((e) => e.name === "background")).toBeUndefined();
      
      fs.rmSync(dir, { recursive: true, force: true });
    });

    it("handles findNamedScript fallback to existsSync", async () => {
      const dir = fs.mkdtempSync(path.join(tmpdir(), "addfox-named-script-"));
      fs.writeFileSync(path.join(dir, "popup.html"), "<html></html>", "utf-8");
      fs.writeFileSync(path.join(dir, "popup.ts"), "// script", "utf-8");
      
      const entries = discoverEntries(dir);
      const popup = entries.find((e) => e.name === "popup");
      expect(popup).toBeDefined();
      expect(popup?.scriptPath).toMatch(/popup\.ts$/);
      
      fs.rmSync(dir, { recursive: true, force: true });
    });

    it("handles getScriptInjectIfMatches with script in body", async () => {
      const dir = fs.mkdtempSync(path.join(tmpdir(), "addfox-inject-body-"));
      fs.mkdirSync(path.join(dir, "popup"), { recursive: true });
      fs.writeFileSync(
        path.join(dir, "popup", "index.html"),
        '<html><body><script data-addfox-entry src="./index.ts"></script></body></html>',
        "utf-8"
      );
      fs.writeFileSync(path.join(dir, "popup", "index.ts"), "// script", "utf-8");
      
      const entries = discoverEntries(dir);
      const popup = entries.find((e) => e.name === "popup");
      expect(popup).toBeDefined();
      expect(popup?.scriptInject).toBe("body");
      
      fs.rmSync(dir, { recursive: true, force: true });
    });

    it("handles findNamedHtml with baseContents", async () => {
      const dir = fs.mkdtempSync(path.join(tmpdir(), "addfox-named-html-"));
      fs.writeFileSync(path.join(dir, "options.html"), "<html></html>", "utf-8");
      fs.writeFileSync(path.join(dir, "options.ts"), "// script", "utf-8");
      
      const entries = discoverEntries(dir);
      const options = entries.find((e) => e.name === "options");
      expect(options).toBeDefined();
      expect(options?.htmlPath).toMatch(/options\.html$/);
      
      fs.rmSync(dir, { recursive: true, force: true });
    });

    it("returns empty array when directory does not exist", async () => {
      const entries = discoverEntries("/nonexistent/directory/that/does/not/exist");
      expect(entries).toEqual([]);
    });

    it("returns empty array when directory has no entry subdirs", async () => {
      const dir = fs.mkdtempSync(path.join(tmpdir(), "addfox-empty-"));
      fs.mkdirSync(path.join(dir, "subdir"), { recursive: true });
      fs.writeFileSync(path.join(dir, "subdir", "file.txt"), "content", "utf-8");
      
      const entries = discoverEntries(dir);
      expect(entries).toEqual([]);
      
      fs.rmSync(dir, { recursive: true, force: true });
    });
  });
});
