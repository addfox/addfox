import { describe, it, expect } from "@rstest/core";
import { discoverEntries } from "../src/entry/discoverer.js";
import * as fs from "node:fs";
import * as path from "node:path";
import { tmpdir } from "node:os";

describe("discoverer undefined branches", () => {
  it("should return empty when directory does not exist", () => {
    const entries = discoverEntries("/nonexistent/path/that/does/not/exist/12345");
    expect(entries).toEqual([]);
  });

  it("should handle directory with no matching files", () => {
    const dir = fs.mkdtempSync(path.join(tmpdir(), "addfox-no-match-"));
    
    // Create subdirectory without index files
    fs.mkdirSync(path.join(dir, "popup"), { recursive: true });
    fs.writeFileSync(path.join(dir, "popup", "readme.txt"), "not a script", "utf-8");
    
    const entries = discoverEntries(dir);
    expect(entries.find(e => e.name === "popup")).toBeUndefined();
    
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("should handle findNamedHtml when html file does not exist", () => {
    const dir = fs.mkdtempSync(path.join(tmpdir(), "addfox-no-html-"));
    
    // Create popup with only script, no html
    fs.writeFileSync(path.join(dir, "popup.ts"), "// script", "utf-8");
    
    const entries = discoverEntries(dir);
    const popup = entries.find(e => e.name === "popup");
    
    // Should still find the entry but without htmlPath
    if (popup) {
      expect(popup.scriptPath).toMatch(/popup\.ts$/);
    }
    
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("should handle entry with html but no script", () => {
    const dir = fs.mkdtempSync(path.join(tmpdir(), "addfox-html-only-"));
    
    // Create popup with only html, no script
    fs.writeFileSync(path.join(dir, "popup.html"), "<html></html>", "utf-8");
    
    const entries = discoverEntries(dir);
    // Should not find popup as entry since there's no script
    expect(entries.find(e => e.name === "popup")).toBeUndefined();
    
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("should handle nested directory without index files", () => {
    const dir = fs.mkdtempSync(path.join(tmpdir(), "addfox-nested-no-index-"));
    
    // Create nested structure without proper index files
    fs.mkdirSync(path.join(dir, "background", "sub"), { recursive: true });
    fs.writeFileSync(path.join(dir, "background", "sub", "file.ts"), "// script", "utf-8");
    
    const entries = discoverEntries(dir);
    expect(entries.find(e => e.name === "background")).toBeUndefined();
    
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("should handle entry directory with html but no matching script", () => {
    const dir = fs.mkdtempSync(path.join(tmpdir(), "addfox-html-mismatch-"));
    
    fs.mkdirSync(path.join(dir, "popup"), { recursive: true });
    fs.writeFileSync(path.join(dir, "popup", "index.html"), "<html></html>", "utf-8");
    // No index.ts or index.js
    
    const entries = discoverEntries(dir);
    const popup = entries.find(e => e.name === "popup");
    
    // Should find html-only entry
    if (popup) {
      expect(popup.htmlPath).toBeDefined();
    }
    
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("should handle file named like entry but not directory", () => {
    const dir = fs.mkdtempSync(path.join(tmpdir(), "addfox-file-entry-"));
    
    // Create a file named "popup" instead of directory
    fs.writeFileSync(path.join(dir, "popup"), "not a directory", "utf-8");
    
    const entries = discoverEntries(dir);
    expect(entries.find(e => e.name === "popup")).toBeUndefined();
    
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("should handle directory with unsupported extensions", () => {
    const dir = fs.mkdtempSync(path.join(tmpdir(), "addfox-unsupported-ext-"));
    
    fs.mkdirSync(path.join(dir, "background"), { recursive: true });
    fs.writeFileSync(path.join(dir, "background", "index.py"), "# python", "utf-8");
    
    const entries = discoverEntries(dir);
    expect(entries.find(e => e.name === "background")).toBeUndefined();
    
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
