import { describe, expect, it } from "@rstest/core";

import { getEntryTag, HMR_INVALIDATE_PREPEND } from "../src/constants.ts";
import {
  clearPathCache,
  normalizePathForCompare,
  transformCodeToDisableHmr,
} from "../src/hmr/disable.ts";

describe("hmr constants & disable", () => {
  it("getEntryTag returns tag for background/content and empty for others", () => {
    expect(getEntryTag("background")).toBe("/* addfox-entry:background */");
    expect(getEntryTag("content")).toBe("/* addfox-entry:content */");
    expect(getEntryTag("popup")).toBe("");
  });

  it("normalizePathForCompare returns normalized unix-style path and caches", () => {
    const p = "C:\\tmp\\addfox-disable\\entry.js";
    const a = normalizePathForCompare(p);
    const b = normalizePathForCompare(p);
    expect(a).toBe(b);
    expect(a).toContain("/tmp/addfox-disable/entry.js");
  });

  it("clearPathCache clears cache without throwing", () => {
    expect(() => clearPathCache()).not.toThrow();
  });

  it("transformCodeToDisableHmr returns original code when entries array is empty", () => {
    const code = "console.log('x')";
    expect(transformCodeToDisableHmr("/any/path.js", [], code)).toBe(code);
  });

  it("transformCodeToDisableHmr returns original code when no entry matches path", () => {
    const code = "console.log('x')";
    expect(
      transformCodeToDisableHmr("/target.js", [{ name: "background", path: "/other.js" }], code)
    ).toBe(code);
  });

  it("transformCodeToDisableHmr prepends entry tag + HMR invalidate when entry matches", () => {
    const code = "console.log('x')";
    const resourcePath = "/tmp/entry.js";
    const transformed = transformCodeToDisableHmr(
      resourcePath,
      [{ name: "background", path: resourcePath }],
      code
    );

    expect(transformed).toContain(getEntryTag("background"));
    expect(transformed).toContain("module.hot.invalidate()");
    expect(transformed).toContain(code);
    expect(transformed.endsWith(code)).toBe(true);
    expect(transformed).toContain(HMR_INVALIDATE_PREPEND.trim());
  });
});

