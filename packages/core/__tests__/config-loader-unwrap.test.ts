import { describe, it, expect } from "@rstest/core";

describe("unwrapConfig branches", () => {
  it("should handle null module", async () => {
    // Create a config that exports null
    const testDir = fs.mkdtempSync(path.join(tmpdir(), "addfox-unwrap-null-"));
    fs.writeFileSync(
      path.join(testDir, "addfox.config.js"),
      `module.exports = null;`
    );

    const { loadConfigFile } = await import("../src/config/loader.js");
    const result = loadConfigFile(testDir);
    
    expect(result).toEqual({});
    
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  it("should handle undefined default export", async () => {
    const testDir = fs.mkdtempSync(path.join(tmpdir(), "addfox-unwrap-undef-"));
    fs.writeFileSync(
      path.join(testDir, "addfox.config.js"),
      `module.exports = { default: undefined };`
    );

    const { loadConfigFile } = await import("../src/config/loader.js");
    const result = loadConfigFile(testDir);
    
    expect(result).toEqual({});
    
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  it("should handle config with default export", async () => {
    const testDir = fs.mkdtempSync(path.join(tmpdir(), "addfox-unwrap-default-"));
    fs.writeFileSync(
      path.join(testDir, "addfox.config.js"),
      `module.exports = { default: { name: 'test' } };`
    );

    const { loadConfigFile } = await import("../src/config/loader.js");
    const result = loadConfigFile(testDir);
    
    expect(result).toEqual({ name: "test" });
    
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  it("should handle direct config export", async () => {
    const testDir = fs.mkdtempSync(path.join(tmpdir(), "addfox-unwrap-direct-"));
    fs.writeFileSync(
      path.join(testDir, "addfox.config.js"),
      `module.exports = { name: 'direct' };`
    );

    const { loadConfigFile } = await import("../src/config/loader.js");
    const result = loadConfigFile(testDir);
    
    expect(result).toEqual({ name: "direct" });
    
    fs.rmSync(testDir, { recursive: true, force: true });
  });
});

import * as fs from "node:fs";
import * as path from "node:path";
import { tmpdir } from "node:os";
