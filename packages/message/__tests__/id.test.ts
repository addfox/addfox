import { describe, it, expect } from "@rstest/core";
import { createMsgId } from "../src/id.js";

describe("createMsgId", () => {
  it("falls back to a timestamped counter when crypto.randomUUID is unavailable", () => {
    const original = (globalThis as any).crypto;
    Object.defineProperty(globalThis, "crypto", {
      value: {},
      configurable: true,
      writable: true,
    });

    try {
      const id = createMsgId();
      expect(id.startsWith("afm-")).toBe(true);
    } finally {
      Object.defineProperty(globalThis, "crypto", {
        value: original,
        configurable: true,
        writable: true,
      });
    }
  });
});
