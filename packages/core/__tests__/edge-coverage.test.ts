/**
 * Tests specifically designed to cover edge case branches
 * that are difficult to reach through normal testing.
 */

import { describe, it, expect } from "@rstest/core";

// Test to increase coverage of defensive code branches
describe("Edge case coverage", () => {
  it("should handle various truthy values in manifest", async () => {
    const { getManifestRecordForTarget } = await import("../src/manifest/builder.js");
    
    // Test with manifest that has various non-empty field types
    const config = {
      manifest_version: 3,
      name: "test",
      version: "1.0",
      // These should all trigger isEntryFieldEmpty to return false
      icons: { "16": "icon16.png" }, // object
      background: { service_worker: "bg.js" }, // object
      action: { default_popup: "popup.html" }, // object
    };
    
    const result = getManifestRecordForTarget(config as any, "chromium");
    expect(result.name).toBe("test");
  });

  it("should handle manifest processing with all field types", async () => {
    const { resolveManifestForTarget } = await import("../src/manifest/builder.js");
    
    const config = {
      chromium: {
        manifest_version: 3,
        name: "test",
        version: "1.0",
        // Mix of field types
        permissions: ["storage"], // non-empty array
        optional_permissions: [], // empty array
        host_permissions: undefined, // undefined
        description: "", // empty string
        background: { service_worker: "bg.js" }, // object
        action: { default_popup: "popup.html" }, // object
      }
    };
    
    const entries = [
      { name: "popup", scriptPath: "./popup.js", html: true },
    ];
    
    const result = resolveManifestForTarget(config as any, entries, "chromium");
    expect(result.name).toBe("test");
  });

  it("should handle multiple entry discovery", async () => {
    const { discoverEntries } = await import("../src/entry/discoverer.js");
    const fs = await import("node:fs");
    const path = await import("node:path");
    const { tmpdir } = await import("node:os");
    
    const dir = fs.mkdtempSync(path.join(tmpdir(), "addfox-multi-entry-"));
    
    // Create multiple entry points
    fs.writeFileSync(path.join(dir, "popup.ts"), "// popup", "utf-8");
    fs.writeFileSync(path.join(dir, "popup.html"), "<html></html>", "utf-8");
    fs.writeFileSync(path.join(dir, "options.ts"), "// options", "utf-8");
    fs.writeFileSync(path.join(dir, "options.html"), "<html></html>", "utf-8");
    fs.writeFileSync(path.join(dir, "background.ts"), "// bg", "utf-8");
    fs.writeFileSync(path.join(dir, "content.ts"), "// content", "utf-8");
    
    const entries = discoverEntries(dir);
    
    expect(entries.length).toBeGreaterThanOrEqual(3);
    
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
