import { describe, expect, it } from "@rstest/core";
import { wrapBrowser } from "../../src/browser/index.js";

describe("wrapBrowser edge cases for branch coverage", () => {
  it("should use default isMonitorInternal when not provided", () => {
    const browser = {
      runtime: {
        onMessage: {
          addListener: (cb: (msg: unknown) => unknown) => {
            // Simulate calling with a message that would be filtered if isMonitorInternal was provided
            const result = cb({ __ADDFOX_DEBUG__: true });
            expect(result).not.toBeUndefined(); // Default function returns false, so callback is called
          },
        },
      },
    };

    const errorHandler = () => {};
    const wrapped = wrapBrowser(browser, errorHandler);
    const onMessage = (wrapped.runtime as Record<string, unknown>).onMessage as {
      addListener: (cb: (msg: unknown) => unknown) => void;
    };

    onMessage.addListener((msg) => msg);
  });

  it("should return already wrapped browser on double wrap", () => {
    const browser = {
      runtime: {
        onMessage: { addListener: () => {} },
      },
    };

    const errorHandler = () => {};
    const wrapped1 = wrapBrowser(browser, errorHandler);
    
    // Second wrap should return the same browser object
    const wrapped2 = wrapBrowser(wrapped1, errorHandler);
    expect(wrapped1).toBe(wrapped2);
  });

  it("should handle non-function properties in runtime", () => {
    const browser = {
      runtime: {
        onMessage: { addListener: () => {} },
        id: "test-id", // non-function property
        OnInstalledReason: { CHROME_UPDATE: "chrome_update" }, // nested object
      },
    };

    const errorHandler = () => {};
    const wrapped = wrapBrowser(browser, errorHandler);
    
    expect((wrapped.runtime as Record<string, unknown>).id).toBe("test-id");
    expect(((wrapped.runtime as Record<string, unknown>).OnInstalledReason as Record<string, string>).CHROME_UPDATE).toBe("chrome_update");
  });

  it("should handle browser without runtime", () => {
    const browser = {
      storage: { local: {} },
    };

    const errorHandler = () => {};
    const wrapped = wrapBrowser(browser as Record<string, unknown>, errorHandler);
    
    expect(wrapped.storage).toBeDefined();
    expect((wrapped as Record<string, unknown>).runtime).toBeUndefined();
  });

  it("should handle event target without removeListener/hasListener", () => {
    const browser = {
      runtime: {
        onMessage: {
          addListener: () => {},
          // no removeListener or hasListener
        },
      },
    };

    const errorHandler = () => {};
    const wrapped = wrapBrowser(browser, errorHandler);
    const onMessage = (wrapped.runtime as Record<string, unknown>).onMessage as {
      addListener: () => void;
      removeListener?: () => void;
      hasListener?: () => void;
    };

    onMessage.addListener(() => {});
    expect(onMessage.removeListener).toBeUndefined();
    expect(onMessage.hasListener).toBeUndefined();
  });

  it("should return same event target when already wrapped", () => {
    // Create a target and mark it as wrapped
    const target = {
      addListener: () => {},
      removeListener: () => {},
    };
    // Manually mark as wrapped
    Object.defineProperty(target, Symbol.for("addfox.runtime.wrapped"), {
      value: true,
      writable: false,
      enumerable: false,
      configurable: true,
    });

    const errorHandler = () => {};
    const wrapped = wrapBrowser(
      { runtime: { onMessage: target } },
      errorHandler
    );

    // Should return the same target object
    expect((wrapped.runtime as Record<string, unknown>).onMessage).toBe(target);
  });
});
