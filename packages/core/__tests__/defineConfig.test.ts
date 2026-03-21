import { describe, expect, it } from "@rstest/core";
import { defineConfig } from "../src/config/defineConfig.ts";

describe("defineConfig", () => {
  it("returns config unchanged", () => {
    const config = {
      manifest: { name: "Test", version: "0.0.1", manifest_version: 3 },
    };
    expect(defineConfig(config)).toBe(config);
  });
});
