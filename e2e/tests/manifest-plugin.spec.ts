/**
 * E2E Tests for Manifest and Entry plugins
 * 
 * Tests the manifest generation and entry resolution
 */

import { test, expect } from "@playwright/test";
import { getExtensionPath, loadExtension, getExtensionId } from "../fixtures/extension";
import * as fs from "node:fs";
import * as path from "path";

test.describe("Manifest Plugin", () => {
  test("should generate valid manifest.json", async ({ context }) => {
    const extensionPath = getExtensionPath();
    
    // Read manifest file
    const manifestPath = path.join(extensionPath, "manifest.json");
    expect(fs.existsSync(manifestPath)).toBe(true);
    
    const manifestContent = fs.readFileSync(manifestPath, "utf-8");
    const manifest = JSON.parse(manifestContent);
    
    // Verify manifest structure
    expect(manifest.manifest_version).toBeDefined();
    expect(manifest.name).toBeDefined();
    expect(manifest.version).toBeDefined();
  });

  test("should include all entry points in manifest", async ({ context }) => {
    const extensionPath = getExtensionPath();
    const manifestPath = path.join(extensionPath, "manifest.json");
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
    
    // Check for common entry points
    if (manifest.background) {
      expect(manifest.background.service_worker || manifest.background.scripts).toBeDefined();
    }
    
    if (manifest.action) {
      expect(manifest.action.default_popup).toBeDefined();
    }
  });

  test("should generate correct content script entries", async ({ context }) => {
    const extensionPath = getExtensionPath();
    const manifestPath = path.join(extensionPath, "manifest.json");
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
    
    if (manifest.content_scripts) {
      expect(Array.isArray(manifest.content_scripts)).toBe(true);
      for (const cs of manifest.content_scripts) {
        expect(cs.matches).toBeDefined();
        expect(cs.js).toBeDefined();
      }
    }
  });

  test("should handle browser-specific manifest fields", async ({ context }) => {
    const extensionPath = getExtensionPath();
    const manifestPath = path.join(extensionPath, "manifest.json");
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
    
    // Chrome/Edge specific
    if (manifest.manifest_version === 3) {
      expect(manifest.action).toBeDefined();
    }
  });
});

test.describe("Entry Plugin", () => {
  test("should build all entry points", async ({ context }) => {
    const extensionPath = getExtensionPath();
    
    // Check for common entry files
    const entries = ["popup", "options", "background", "content"];
    
    for (const entry of entries) {
      const entryDir = path.join(extensionPath, entry);
      if (fs.existsSync(entryDir)) {
        // Entry directory exists
        const files = fs.readdirSync(entryDir);
        expect(files.length).toBeGreaterThan(0);
      }
    }
  });

  test("should generate HTML files for UI entries", async ({ context }) => {
    const extensionPath = getExtensionPath();
    
    const uiEntries = ["popup", "options"];
    
    for (const entry of uiEntries) {
      const htmlPath = path.join(extensionPath, entry, "index.html");
      if (fs.existsSync(htmlPath)) {
        const content = fs.readFileSync(htmlPath, "utf-8");
        expect(content).toContain("<html");
        expect(content).toContain("</html>");
      }
    }
  });

  test("should generate JS files for script entries", async ({ context }) => {
    const extensionPath = getExtensionPath();
    
    const scriptEntries = ["background", "content"];
    
    for (const entry of scriptEntries) {
      const entryDir = path.join(extensionPath, entry);
      if (fs.existsSync(entryDir)) {
        const files = fs.readdirSync(entryDir);
        const hasJsFile = files.some(f => f.endsWith(".js"));
        expect(hasJsFile).toBe(true);
      }
    }
  });
});
