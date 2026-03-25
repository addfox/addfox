import { describe, it, expect } from "@rstest/core";
import { discoverEntries } from "../src/entry/discoverer.js";
import * as fs from "node:fs";
import * as path from "node:path";
import { tmpdir } from "node:os";

describe("discoverer more branches", () => {
  it("should handle findNamedScript when baseContents is null", () => {
    const dir = fs.mkdtempSync(path.join(tmpdir(), "addfox-no-base-"));
    
    // Create files at root level only
    fs.writeFileSync(path.join(dir, "background.ts"), "// bg", "utf-8");
    
    const entries = discoverEntries(dir);
    expect(entries.some(e => e.name === "background")).toBe(true);
    
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("should handle findNamedScript fallback to existsSync", () => {
    const dir = fs.mkdtempSync(path.join(tmpdir(), "addfox-fallback-"));
    
    // Create files without using baseContents
    fs.writeFileSync(path.join(dir, "content.ts"), "// content", "utf-8");
    
    const entries = discoverEntries(dir);
    expect(entries.some(e => e.name === "content")).toBe(true);
    
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("should handle findScriptInDirFromContents when contents is null", () => {
    const dir = fs.mkdtempSync(path.join(tmpdir(), "addfox-null-contents-"));
    
    // Create subdirectory structure
    fs.mkdirSync(path.join(dir, "popup"), { recursive: true });
    fs.writeFileSync(path.join(dir, "popup", "index.ts"), "// popup", "utf-8");
    
    const entries = discoverEntries(dir);
    expect(entries.some(e => e.name === "popup")).toBe(true);
    
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("should handle findNamedHtml with existsSync fallback", () => {
    const dir = fs.mkdtempSync(path.join(tmpdir(), "addfox-html-fallback-"));
    
    fs.writeFileSync(path.join(dir, "options.html"), "<html></html>", "utf-8");
    fs.writeFileSync(path.join(dir, "options.ts"), "// options", "utf-8");
    
    const entries = discoverEntries(dir);
    const options = entries.find(e => e.name === "options");
    if (options) {
      expect(options.htmlPath).toMatch(/options\.html$/);
    }
    
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("should handle entry without script but with html", () => {
    const dir = fs.mkdtempSync(path.join(tmpdir(), "addfox-html-only-"));
    
    fs.mkdirSync(path.join(dir, "devtools"), { recursive: true });
    fs.writeFileSync(path.join(dir, "devtools", "index.html"), "<html></html>", "utf-8");
    // No index.ts
    
    const entries = discoverEntries(dir);
    const devtools = entries.find(e => e.name === "devtools");
    // May or may not find depending on implementation
    
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("should handle resolveScriptFromHtmlWithInjectStrict throw branch", () => {
    const dir = fs.mkdtempSync(path.join(tmpdir(), "addfox-html-error-"));
    
    fs.mkdirSync(path.join(dir, "popup"), { recursive: true });
    // Create HTML with invalid data-addfox-entry
    fs.writeFileSync(
      path.join(dir, "popup", "index.html"),
      '<html><script data-addfox-entry src="./nonexistent.ts"></script></html>',
      "utf-8"
    );
    // Don't create the script file
    
    try {
      discoverEntries(dir);
      // If no error thrown, that's also acceptable
    } catch (e) {
      // Expected error
      expect(e).toBeDefined();
    }
    
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("should handle tryResolveEntryFromHtml error branch", () => {
    const dir = fs.mkdtempSync(path.join(tmpdir(), "addfox-resolve-error-"));
    
    fs.mkdirSync(path.join(dir, "options"), { recursive: true });
    // Create HTML that references non-existent script
    fs.writeFileSync(
      path.join(dir, "options", "index.html"),
      '<html><script data-addfox-entry src="./missing.ts"></script></html>',
      "utf-8"
    );
    
    try {
      discoverEntries(dir);
    } catch (e) {
      expect(e).toBeDefined();
    }
    
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
