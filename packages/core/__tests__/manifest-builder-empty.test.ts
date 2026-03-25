import { describe, it, expect } from "@rstest/core";
import { getManifestRecordForTarget } from "../src/manifest/builder.js";
import type { ManifestRecord } from "../src/types.ts";

describe("manifest builder empty field handling", () => {
  it("should handle undefined field", () => {
    const config: ManifestRecord = {
      manifest_version: 3,
      name: "test",
      version: "1.0",
      background: undefined,
    };
    const result = getManifestRecordForTarget(config, "chromium");
    expect(result.background).toBeUndefined();
  });

  it("should handle null field", () => {
    const config: ManifestRecord = {
      manifest_version: 3,
      name: "test",
      version: "1.0",
      // @ts-ignore - testing null
      background: null,
    };
    const result = getManifestRecordForTarget(config, "chromium");
    // @ts-ignore
    expect(result.background).toBeNull();
  });

  it("should handle empty string field", () => {
    const config: ManifestRecord = {
      manifest_version: 3,
      name: "test",
      version: "1.0",
      description: "",
    };
    const result = getManifestRecordForTarget(config, "chromium");
    expect(result.description).toBe("");
  });

  it("should handle empty array field", () => {
    const config: ManifestRecord = {
      manifest_version: 3,
      name: "test",
      version: "1.0",
      permissions: [],
    };
    const result = getManifestRecordForTarget(config, "chromium");
    expect(result.permissions).toEqual([]);
  });

  it("should handle object field (not empty)", () => {
    const config: ManifestRecord = {
      manifest_version: 3,
      name: "test",
      version: "1.0",
      action: { default_popup: "popup.html" },
    };
    const result = getManifestRecordForTarget(config, "chromium");
    expect(result.action).toEqual({ default_popup: "popup.html" });
  });

  it("should handle number field (not empty)", () => {
    const config: ManifestRecord = {
      manifest_version: 3,
      name: "test",
      version: "1.0",
    };
    const result = getManifestRecordForTarget(config, "chromium");
    expect(result.manifest_version).toBe(3);
  });

  it("should handle boolean field", () => {
    const config: ManifestRecord = {
      manifest_version: 3,
      name: "test",
      version: "1.0",
    };
    const result = getManifestRecordForTarget(config, "chromium");
    expect(typeof result.manifest_version).toBe("number");
  });
});
