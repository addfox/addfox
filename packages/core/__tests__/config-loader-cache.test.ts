import { describe, it, expect } from "@rstest/core";
import { clearConfigCache } from "../src/config/loader.js";
import * as fs from "node:fs";
import * as path from "node:path";
import { tmpdir } from "node:os";

describe("clearConfigCache branches", () => {
  it("should not throw when clearing non-existent cache entry", () => {
    expect(() => clearConfigCache("/non/existent/path.js")).not.toThrow();
  });

  it("should handle cache with matching filename", () => {
    // Create a temp file to add to require.cache
    const testFile = path.join(tmpdir(), `test-module-${Date.now()}.js`);
    fs.writeFileSync(testFile, "module.exports = {};");
    
    // Load it to add to cache
    require(testFile);
    
    // Clear should not throw
    expect(() => clearConfigCache(testFile)).not.toThrow();
    
    // Cleanup
    fs.unlinkSync(testFile);
  });

  it("should handle cache with non-matching filename", () => {
    // Create a temp file
    const testFile = path.join(tmpdir(), `test-module-2-${Date.now()}.js`);
    const otherFile = path.join(tmpdir(), `other-module-${Date.now()}.js`);
    fs.writeFileSync(testFile, "module.exports = {};");
    
    // Load it
    require(testFile);
    
    // Clear with different path should not throw
    expect(() => clearConfigCache(otherFile)).not.toThrow();
    
    // Cleanup
    fs.unlinkSync(testFile);
  });
});
