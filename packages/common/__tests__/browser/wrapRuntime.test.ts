import { describe, expect, it } from "@rstest/core";
import { wrapBrowser, normalizeError } from "../../src/browser/index.js";

describe("wrapBrowser", () => {
  it("should export wrapBrowser function", () => {
    expect(typeof wrapBrowser).toBe("function");
  });

  it("should wrap browser object", () => {
    const mockBrowser = {
      runtime: {
        onMessage: {
          addListener: () => {},
        },
      },
    };
    
    const errorHandler = () => {};
    const wrapped = wrapBrowser(mockBrowser, errorHandler);
    
    expect(wrapped).toBeDefined();
    expect(wrapped.runtime).toBeDefined();
  });

  it("should not double wrap the same object", () => {
    const mockBrowser = {
      runtime: { onMessage: { addListener: () => {} } },
    };
    const errorHandler = () => {};
    
    const wrapped1 = wrapBrowser(mockBrowser, errorHandler);
    const wrapped2 = wrapBrowser(wrapped1, errorHandler);
    
    expect(wrapped1).toBe(wrapped2);
  });

  it("should preserve non-runtime properties", () => {
    const mockBrowser = {
      runtime: { onMessage: { addListener: () => {} } },
      storage: { local: { get: () => {} } },
    };
    const errorHandler = () => {};
    
    const wrapped = wrapBrowser(mockBrowser, errorHandler);
    
    expect(wrapped.storage).toBe(mockBrowser.storage);
  });
});

describe("normalizeError", () => {
  it("should export normalizeError function", () => {
    expect(typeof normalizeError).toBe("function");
  });

  it("should normalize Error instances", () => {
    const error = new Error("Test error");
    const result = normalizeError(error);
    
    expect(result.message).toBe("Test error");
    expect(result.stack).toBeDefined();
    expect(result.time).toBeGreaterThan(0);
  });

  it("should handle string errors", () => {
    const result = normalizeError("String error");
    expect(result.message).toBe("String error");
  });

  it("should handle null/undefined", () => {
    expect(normalizeError(null).message).toBe("Unknown error");
    expect(normalizeError(undefined).message).toBe("Unknown error");
  });

  it("should handle custom error objects", () => {
    const custom = { message: "Custom", stack: "Stack trace" };
    const result = normalizeError(custom);
    expect(result.message).toBe("Custom");
    expect(result.stack).toBe("Stack trace");
  });

  it("should handle objects without message", () => {
    const obj = { foo: "bar" };
    const result = normalizeError(obj);
    // Object without message is converted to string
    expect(result.message).toBeDefined();
    expect(typeof result.message).toBe("string");
  });
});
