import { describe, expect, it } from "@rstest/core";
import {
  pushWebExtStdoutOrigin,
  popWebExtStdoutOrigin,
  getWebExtStdoutOriginDepth,
} from "../src/webExtStdoutOrigin.js";

describe("webExtStdoutOrigin", () => {
  // Reset state before each test would be ideal, but we can't access the private variable
  // So we'll test the cumulative behavior

  it("should start with depth 0", () => {
    const depth = getWebExtStdoutOriginDepth();
    expect(typeof depth).toBe("number");
    expect(depth >= 0).toBe(true);
  });

  it("should increment depth on push", () => {
    const before = getWebExtStdoutOriginDepth();
    pushWebExtStdoutOrigin();
    const after = getWebExtStdoutOriginDepth();
    expect(after).toBe(before + 1);
  });

  it("should decrement depth on pop", () => {
    // First push to ensure we have something to pop
    pushWebExtStdoutOrigin();
    const before = getWebExtStdoutOriginDepth();
    popWebExtStdoutOrigin();
    const after = getWebExtStdoutOriginDepth();
    expect(after).toBe(before - 1);
  });

  it("should not go below 0 on pop", () => {
    // Pop multiple times to try to go negative
    for (let i = 0; i < 10; i++) {
      popWebExtStdoutOrigin();
    }
    expect(getWebExtStdoutOriginDepth()).toBe(0);
  });

  it("should handle multiple push/pop cycles", () => {
    // Reset to 0
    while (getWebExtStdoutOriginDepth() > 0) {
      popWebExtStdoutOrigin();
    }
    
    // Multiple pushes
    pushWebExtStdoutOrigin();
    pushWebExtStdoutOrigin();
    pushWebExtStdoutOrigin();
    expect(getWebExtStdoutOriginDepth()).toBe(3);

    // Multiple pops
    popWebExtStdoutOrigin();
    popWebExtStdoutOrigin();
    expect(getWebExtStdoutOriginDepth()).toBe(1);

    // Push again
    pushWebExtStdoutOrigin();
    expect(getWebExtStdoutOriginDepth()).toBe(2);

    // Pop all
    popWebExtStdoutOrigin();
    popWebExtStdoutOrigin();
    expect(getWebExtStdoutOriginDepth()).toBe(0);
  });
});
