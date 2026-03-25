import { describe, it, expect } from "@rstest/core";
import { 
  getManifestRecordForTarget,
  resolveManifestForTarget,
} from "../src/manifest/builder.js";
import type { ManifestConfig, ManifestRecord, EntryInfo } from "../src/types.ts";

// Testing internal function behavior through public API
describe("manifest builder isEntryFieldEmpty branches", () => {
  describe("getManifestRecordForTarget with various manifest configs", () => {
    it("should handle empty string fields in manifest", () => {
      const config: ManifestRecord = {
        manifest_version: 3,
        name: "test",
        version: "1.0",
        description: "", // empty string
      };
      const result = getManifestRecordForTarget(config, "chromium");
      expect(result.name).toBe("test");
    });

    it("should handle array fields in manifest", () => {
      const config: ManifestRecord = {
        manifest_version: 3,
        name: "test",
        version: "1.0",
        permissions: [], // empty array
      };
      const result = getManifestRecordForTarget(config, "chromium");
      expect(result.permissions).toEqual([]);
    });

    it("should handle null/undefined fields in manifest", () => {
      const config: ManifestRecord = {
        manifest_version: 3,
        name: "test",
        version: "1.0",
        background: undefined,
      };
      const result = getManifestRecordForTarget(config, "chromium");
      expect(result.background).toBeUndefined();
    });

    it("should handle non-empty array fields", () => {
      const config: ManifestRecord = {
        manifest_version: 3,
        name: "test",
        version: "1.0",
        permissions: ["storage", "tabs"], // non-empty array
      };
      const result = getManifestRecordForTarget(config, "chromium");
      expect(result.permissions).toEqual(["storage", "tabs"]);
    });

    it("should handle non-empty string fields", () => {
      const config: ManifestRecord = {
        manifest_version: 3,
        name: "test",
        version: "1.0",
        description: "A test extension", // non-empty string
      };
      const result = getManifestRecordForTarget(config, "chromium");
      expect(result.description).toBe("A test extension");
    });

    it("should handle object fields (not empty)", () => {
      const config: ManifestRecord = {
        manifest_version: 3,
        name: "test",
        version: "1.0",
        action: {
          default_popup: "popup.html",
        },
      };
      const result = getManifestRecordForTarget(config, "chromium");
      expect(result.action).toEqual({ default_popup: "popup.html" });
    });
  });

  describe("resolveManifestForTarget with entry processing", () => {
    const mockEntries: EntryInfo[] = [
      { name: "background", scriptPath: "./background.js", html: false },
      { name: "popup", scriptPath: "./popup.js", htmlPath: "./popup.html", html: true },
    ];

    it("should handle manifest with only chromium config", () => {
      const config: ManifestConfig = {
        chromium: {
          manifest_version: 3,
          name: "chromium-only",
          version: "1.0",
        },
      };
      const result = resolveManifestForTarget(config, mockEntries, "chromium");
      expect(result.name).toBe("chromium-only");
    });

    it("should handle manifest with only firefox config", () => {
      const config: ManifestConfig = {
        firefox: {
          manifest_version: 2,
          name: "firefox-only",
          version: "1.0",
        },
      };
      const result = resolveManifestForTarget(config, mockEntries, "firefox");
      expect(result.name).toBe("firefox-only");
    });

    it("should handle manifest with both configs and chromium target", () => {
      const config: ManifestConfig = {
        chromium: {
          manifest_version: 3,
          name: "chromium-specific",
          version: "1.0",
        },
        firefox: {
          manifest_version: 2,
          name: "firefox-specific",
          version: "1.0",
        },
      };
      const result = resolveManifestForTarget(config, mockEntries, "chromium");
      expect(result.name).toBe("chromium-specific");
    });

    it("should handle manifest with both configs and firefox target", () => {
      const config: ManifestConfig = {
        chromium: {
          manifest_version: 3,
          name: "chromium-specific",
          version: "1.0",
        },
        firefox: {
          manifest_version: 2,
          name: "firefox-specific",
          version: "1.0",
        },
      };
      const result = resolveManifestForTarget(config, mockEntries, "firefox");
      expect(result.name).toBe("firefox-specific");
    });
  });
});
