import { describe, it, expect } from "@rstest/core";
import { 
  getManifestRecordForTarget,
  resolveManifestForTarget,
} from "../src/manifest/builder.js";
import type { ManifestConfig, ManifestRecord, EntryInfo } from "../src/types.ts";

describe("manifest builder branches", () => {
  describe("getManifestRecordForTarget", () => {
    it("should return config directly when not ChromiumFirefoxManifest", () => {
      const config: ManifestRecord = {
        manifest_version: 3,
        name: "test",
        version: "1.0",
      };
      const result = getManifestRecordForTarget(config, "chromium");
      expect(result).toEqual(config);
    });

    it("should return chromium branch when target is chromium", () => {
      const config: ManifestConfig = {
        chromium: {
          manifest_version: 3,
          name: "test-chromium",
          version: "1.0",
        },
        firefox: {
          manifest_version: 2,
          name: "test-firefox",
          version: "1.0",
        },
      };
      const result = getManifestRecordForTarget(config, "chromium");
      expect(result.name).toBe("test-chromium");
    });

    it("should return firefox branch when target is firefox", () => {
      const config: ManifestConfig = {
        chromium: {
          manifest_version: 3,
          name: "test-chromium",
          version: "1.0",
        },
        firefox: {
          manifest_version: 2,
          name: "test-firefox",
          version: "1.0",
        },
      };
      const result = getManifestRecordForTarget(config, "firefox");
      expect(result.name).toBe("test-firefox");
    });
  });

  describe("resolveManifestForTarget", () => {
    const mockEntries: EntryInfo[] = [
      { name: "background", scriptPath: "./background.js", html: false },
      { name: "popup", scriptPath: "./popup.js", htmlPath: "./popup.html", html: true },
    ];

    it("should resolve manifest for chromium", () => {
      const config: ManifestConfig = {
        chromium: {
          manifest_version: 3,
          name: "test",
          version: "1.0",
        },
      };
      const result = resolveManifestForTarget(config, mockEntries, "chromium");
      expect(result.manifest_version).toBe(3);
      expect(result.name).toBe("test");
    });

    it("should resolve manifest for firefox", () => {
      const config: ManifestConfig = {
        firefox: {
          manifest_version: 2,
          name: "test",
          version: "1.0",
        },
      };
      const result = resolveManifestForTarget(config, mockEntries, "firefox");
      expect(result.manifest_version).toBe(2);
      expect(result.name).toBe("test");
    });

    it("should resolve manifest with flat config", () => {
      const config: ManifestRecord = {
        manifest_version: 3,
        name: "flat-test",
        version: "1.0",
      };
      const result = resolveManifestForTarget(config, mockEntries, "chromium");
      expect(result.name).toBe("flat-test");
    });
  });
});
