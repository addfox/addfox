import { describe, expect, it } from "@rstest/core";

import {
  formatBytes,
  isSourceMapEnabled,
  getSourceMapLabel,
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

  it("isSourceMapEnabled detects SourceMapDevToolPlugin", () => {
    // Detect SourceMapDevToolPlugin via the name property
    expect(
      isSourceMapEnabled({
        output: { sourceMap: false },
        tools: { rspack: { plugins: [{ name: "SourceMapDevToolPlugin" }] } },
      })
    ).toBe(true);
    // Detect SourceMapDevToolPlugin via constructor.name
    expect(
      isSourceMapEnabled({
        output: { sourceMap: false },
        tools: { rspack: { plugins: [{ constructor: { name: "SourceMapDevToolPlugin" } }] } },
      })
    ).toBe(true);
    // Return false when the plugin is absent
    expect(
      isSourceMapEnabled({
        output: { sourceMap: false },
        tools: { rspack: { plugins: [] } },
      })
    ).toBe(false);
  });

  it("getSourceMapLabel returns label when source map enabled", () => {
    expect(getSourceMapLabel({ output: { sourceMap: { js: "inline-source-map" } } }))
      .toBe(" (with inline-source-map, vendor excluded)");
    expect(getSourceMapLabel({ output: { sourceMap: false } })).toBe("");
    expect(getSourceMapLabel({})).toBe("");
  });

  it("getSourceMapLabel returns label when SourceMapDevToolPlugin is used", () => {
    expect(
      getSourceMapLabel({
        output: { sourceMap: false },
        tools: { rspack: { plugins: [{ name: "SourceMapDevToolPlugin" }] } },
      })
    ).toBe(" (with inline-source-map, vendor excluded)");
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

