import { describe, expect, it } from "@rstest/core";

import {
  formatBytes,
  isSourceMapEnabled,
  getBuildOutputSize,
} from "../src/utils/buildStats.ts";

describe("buildStats utils", () => {
  it("formatBytes formats B/KB/MB", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(2048)).toBe("2.00 KB");
    expect(formatBytes(3 * 1024 * 1024)).toBe("3.00 MB");
  });

  it("isSourceMapEnabled supports boolean and object js", () => {
    expect(isSourceMapEnabled({ output: { sourceMap: true } })).toBe(true);
    expect(
      isSourceMapEnabled({ output: { sourceMap: { js: "inline" } } })
    ).toBe(true);
    expect(
      isSourceMapEnabled({ output: { sourceMap: { js: 123 } } })
    ).toBe(false);
    expect(isSourceMapEnabled({ output: { sourceMap: false } })).toBe(false);
    expect(isSourceMapEnabled({})).toBe(false);
  });

  it("getBuildOutputSize sums numeric asset sizes", () => {
    const out = getBuildOutputSize({
      stats: {
        toJson: () => ({
          assets: [{ size: 10 }, { size: 5 }, { size: "x" as unknown as number }],
        }),
      },
    });
    expect(out).toBe(15);
  });

  it("getBuildOutputSize returns null when toJson missing or errors", () => {
    expect(getBuildOutputSize({})).toBeNull();
    expect(
      getBuildOutputSize({
        stats: {
          toJson: () => {
            throw new Error("boom");
          },
        },
      })
    ).toBeNull();
    expect(
      getBuildOutputSize({
        stats: {
          toJson: () => ({ assets: [] }),
        },
      })
    ).toBeNull();
  });
});

