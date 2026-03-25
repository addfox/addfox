import { describe, it, expect } from "@rstest/core";
import { extractEntriesFromManifest, hasManifestSourcePaths } from "../src/entry/manifestParser.js";

describe("extractEntriesFromManifest branches", () => {
  it("should return empty entries for manifest with no source paths", () => {
    const manifest = {
      manifest_version: 3,
      name: "test",
      version: "1.0",
      background: { service_worker: "/invalid/path.ext" },
    };
    const result = extractEntriesFromManifest(manifest as any, "chrome");
    expect(result.entries).toEqual({});
    expect(result.replacementMap.size).toBe(0);
  });

  it("should handle MV2 with invalid scripts path", () => {
    const manifest = {
      manifest_version: 2,
      name: "test",
      version: "1.0",
      background: { scripts: ["/invalid/path.ext"] },
    };
    const result = extractEntriesFromManifest(manifest as any, "chrome");
    expect(result.entries).toEqual({});
  });

  it("should handle MV2 with invalid page path (HTML not source file)", () => {
    const manifest = {
      manifest_version: 2,
      name: "test",
      version: "1.0",
      background: { page: "/invalid/page.html" },
    };
    const result = extractEntriesFromManifest(manifest as any, "chrome");
    expect(result.entries).toEqual({});
  });

  it("should handle MV2 with valid scripts path", () => {
    const manifest = {
      manifest_version: 2,
      name: "test",
      version: "1.0",
      background: { scripts: ["./src/background.ts"] },
    };
    const result = extractEntriesFromManifest(manifest as any, "chrome");
    expect(result.entries["background"]).toBe("src/background.ts");
  });

  it("should handle MV2 with valid page path using .ts file (treated as source)", () => {
    const manifest = {
      manifest_version: 2,
      name: "test",
      version: "1.0",
      background: { page: "./src/background.ts" },
    };
    const result = extractEntriesFromManifest(manifest as any, "chrome");
    expect(result.entries["background"]).toBe("src/background.ts");
  });

  it("hasManifestSourcePaths should return false for no source paths", () => {
    const manifest = {
      manifest_version: 3,
      name: "test",
      version: "1.0",
    };
    expect(hasManifestSourcePaths(manifest as any)).toBe(false);
  });
});
