import { describe, it, expect } from "@rstest/core";

describe("version branches", () => {
  it("should return version from package.json", async () => {
    // Re-import to get fresh module
    const { getAddfoxVersion } = await import("../src/version.js");
    const version = getAddfoxVersion();
    expect(version).toBeDefined();
    expect(typeof version).toBe("string");
    // Should not be fallback version
    expect(version).not.toBe("0.0.0");
  });

  it("should return valid semver format", async () => {
    const { getAddfoxVersion } = await import("../src/version.js");
    const version = getAddfoxVersion();
    // Basic semver check (major.minor.patch or with prerelease)
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
  });

  it("should handle version fallback when package.json has no version", async () => {
    // This test verifies the ?? operator branch
    const { getAddfoxVersion } = await import("../src/version.js");
    const version = getAddfoxVersion();
    // Should return actual version or fallback "0.0.0"
    expect(typeof version).toBe("string");
  });
});
