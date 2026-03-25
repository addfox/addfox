import { describe, it, expect } from "@rstest/core";
import * as path from "node:path";
import * as fs from "node:fs";
import { tmpdir } from "node:os";

describe("version fallback", () => {
  it("should return valid version from package.json", async () => {
    const { getAddfoxVersion } = await import("../src/version.js");
    const version = getAddfoxVersion();
    
    // Should be a valid version string
    expect(typeof version).toBe("string");
    expect(version.length).toBeGreaterThan(0);
    expect(version).not.toBe("0.0.0"); // Should find real version
  });

  it("should handle version with fallback", async () => {
    const { getAddfoxVersion } = await import("../src/version.js");
    const version = getAddfoxVersion();
    
    // Version should match semver format or be fallback
    const isSemver = /^\d+\.\d+\.\d+/.test(version);
    const isFallback = version === "0.0.0";
    
    expect(isSemver || isFallback).toBe(true);
  });
});
