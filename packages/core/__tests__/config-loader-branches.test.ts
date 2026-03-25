import { describe, it, expect, beforeEach, afterEach } from "@rstest/core";
import { clearConfigCache, getResolvedRstestConfigFilePath } from "../src/config/loader.js";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe("config loader branch coverage", () => {
  describe("clearConfigCache branches", () => {
    it("should not throw when clearing non-existent cache entry", () => {
      expect(() => clearConfigCache("/non/existent/path.js")).not.toThrow();
    });

    it("should handle cache with filename mismatch", () => {
      // Create a temp module in require.cache that won't match
      const testPath = path.join(tmpdir(), `test-${Date.now()}.js`);
      fs.writeFileSync(testPath, "module.exports = {}");
      
      // Load it to add to cache
      require(testPath);
      
      // Clear with different path (simulating branch where filename doesn't match)
      expect(() => clearConfigCache("/different/path.js")).not.toThrow();
      
      // Cleanup
      fs.unlinkSync(testPath);
    });
  });

  describe("getResolvedRstestConfigFilePath branches", () => {
    it("should return null when no rstest config exists", () => {
      const result = getResolvedRstestConfigFilePath("/non/existent/path");
      expect(result).toBeNull();
    });

    it("should find rstest.config.js when .ts doesn't exist", () => {
      const tmpDir = fs.mkdtempSync(path.join(tmpdir(), "rstest-"));
      fs.writeFileSync(path.join(tmpDir, "rstest.config.js"), "");
      
      const result = getResolvedRstestConfigFilePath(tmpDir);
      expect(result).toBe(path.join(tmpDir, "rstest.config.js"));
      
      // Cleanup
      fs.unlinkSync(path.join(tmpDir, "rstest.config.js"));
      fs.rmdirSync(tmpDir);
    });
  });
});
