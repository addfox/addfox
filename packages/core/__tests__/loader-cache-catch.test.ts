import { describe, it, expect } from "@rstest/core";
import { clearConfigCache } from "../src/config/loader.js";

describe("loader cache clear catch branches", () => {
  it("should handle non-existent cache entry", async () => {
    // Should not throw when clearing non-existent entry
    expect(() => clearConfigCache("/non/existent/file.js")).not.toThrow();
  });

  it("should handle multiple cache clear calls", async () => {
    // Should not throw on multiple calls
    expect(() => clearConfigCache("/path/one.js")).not.toThrow();
    expect(() => clearConfigCache("/path/two.js")).not.toThrow();
    expect(() => clearConfigCache("/path/three.js")).not.toThrow();
  });
});
