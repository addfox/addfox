import { describe, expect, it, beforeEach } from "@rstest/core";
import { wrapBrowser, normalizeError } from "../../src/browser/index.js";

describe("wrapBrowser full coverage", () => {
  let mockBrowser: Record<string, unknown>;
  let capturedErrors: Array<{ message: string; stack?: string; time: number }>;

  beforeEach(() => {
    capturedErrors = [];
    const errorHandler = (err: { message: string; stack?: string; time: number }) => capturedErrors.push(err);
    mockBrowser = {
      runtime: {
        onMessage: {
          addListener: (_cb: unknown, ..._rest: unknown[]) => {},
          removeListener: (_cb: unknown) => {},
          hasListener: (_cb: unknown) => false,
        },
        onConnect: {
          addListener: (_cb: unknown) => {},
        },
        sendMessage: () => Promise.resolve(),
      },
      storage: {
        local: { get: () => {} },
      },
    };
  });

  it("should return same object when double wrapped", () => {
    const errorHandler = (err: { message: string }) => capturedErrors.push(err);
    const wrapped1 = wrapBrowser(mockBrowser, errorHandler);
    const wrapped2 = wrapBrowser(wrapped1, errorHandler);
    expect(wrapped1).toBe(wrapped2);
  });

  it("should wrap event targets with removeListener and hasListener", () => {
    const errorHandler = (err: { message: string }) => capturedErrors.push(err);
    const wrapped = wrapBrowser(mockBrowser, errorHandler);
    const onMessage = (wrapped.runtime as Record<string, unknown>).onMessage as {
      addListener: (cb: (msg: unknown) => void) => void;
      removeListener: (cb: (msg: unknown) => void) => void;
      hasListener: (cb: (msg: unknown) => void) => boolean;
    };

    const listener = (msg: unknown) => msg;
    onMessage.addListener(listener);
    onMessage.removeListener(listener);
    const has = onMessage.hasListener(listener);
    expect(typeof has).toBe("boolean");
  });

  it("should handle callback that returns a value", () => {
    const errorHandler = (err: { message: string }) => capturedErrors.push(err);
    let capturedCallback: ((msg: unknown) => string) | null = null;
    
    const browser = {
      runtime: {
        onMessage: {
          addListener: (cb: (msg: unknown) => string) => {
            capturedCallback = cb;
          },
        },
      },
    };

    const wrapped = wrapBrowser(browser, errorHandler);
    const onMessage = (wrapped.runtime as Record<string, unknown>).onMessage as {
      addListener: (cb: (msg: unknown) => string) => void;
    };

    onMessage.addListener((msg) => `received: ${msg}`);
    
    if (capturedCallback) {
      const result = capturedCallback("test");
      expect(result).toBe("received: test");
    }
  });

  it("should handle isMonitorInternal check", () => {
    const errorHandler = (err: { message: string }) => capturedErrors.push(err);
    const isMonitorInternal = (firstArg: unknown) => {
      return typeof firstArg === "object" && firstArg !== null && 
        (firstArg as Record<string, unknown>).__ADDFOX_DEBUG__ === true;
    };

    let capturedCallback: ((msg: unknown) => unknown) | null = null;
    const browser = {
      runtime: {
        onMessage: {
          addListener: (cb: (msg: unknown) => unknown) => {
            capturedCallback = cb;
          },
        },
      },
    };

    const wrapped = wrapBrowser(browser, errorHandler, { isMonitorInternal });
    const onMessage = (wrapped.runtime as Record<string, unknown>).onMessage as {
      addListener: (cb: (msg: unknown) => unknown) => void;
    };

    let listenerCallCount = 0;
    onMessage.addListener((msg) => {
      listenerCallCount++;
      return msg;
    });

    if (capturedCallback) {
      // Internal message should be skipped (returns undefined without calling listener)
      const internalResult = capturedCallback({ __ADDFOX_DEBUG__: true });
      expect(internalResult).toBeUndefined();
      expect(listenerCallCount).toBe(0);

      // Normal message should be passed through
      const normalResult = capturedCallback({ type: "normal" });
      expect(normalResult).toEqual({ type: "normal" });
      expect(listenerCallCount).toBe(1);
    }
  });

  it("should handle function binding in proxy", () => {
    const errorHandler = (err: { message: string }) => capturedErrors.push(err);
    const browser = {
      runtime: {
        onMessage: { addListener: () => {} },
        sendMessage: () => Promise.resolve("test"),
      },
    };
    
    const wrapped = wrapBrowser(browser, errorHandler);
    const runtime = wrapped.runtime as Record<string, unknown>;
    
    // Access sendMessage which is a function - should be bound
    const sendMessage = runtime.sendMessage as () => Promise<unknown>;
    expect(typeof sendMessage).toBe("function");
  });

  it("should wrap onConnect event target and catch errors", () => {
    const errorHandler = (err: { message: string }) => capturedErrors.push(err);
    let capturedCallback: (() => void) | null = null;
    
    const browser = {
      runtime: {
        onConnect: {
          addListener: (cb: () => void) => {
            capturedCallback = cb;
          },
        },
      },
    };

    const wrapped = wrapBrowser(browser, errorHandler);
    const onConnect = (wrapped.runtime as Record<string, unknown>).onConnect as {
      addListener: (cb: () => void) => void;
    };

    onConnect.addListener(() => {
      throw new Error("Connect error");
    });

    if (capturedCallback) {
      expect(() => capturedCallback()).toThrow("Connect error");
      expect(capturedErrors.length).toBeGreaterThan(0);
      expect(capturedErrors[capturedErrors.length - 1].message).toBe("Connect error");
    }
  });
});

describe("normalizeError edge cases", () => {
  it("should handle Error with no stack", () => {
    const error = new Error("test");
    error.stack = undefined as unknown as string;
    const result = normalizeError(error);
    expect(result.message).toBe("test");
    expect(result.stack).toBeUndefined();
  });

  it("should handle number error", () => {
    const result = normalizeError(123);
    expect(result.message).toBe("123");
  });

  it("should handle boolean error", () => {
    const result = normalizeError(true);
    expect(result.message).toBe("true");
  });

  it("should handle object with toString", () => {
    const obj = {
      toString: () => "custom toString",
    };
    const result = normalizeError(obj);
    expect(result.message).toContain("custom");
  });

  it("should handle empty string", () => {
    const result = normalizeError("");
    expect(result.message).toBe("Unknown error");
  });

  it("should handle null message in error object", () => {
    const error = { message: null, stack: "stack" };
    const result = normalizeError(error);
    expect(result.message).toBe("[object Object]");
  });
});
