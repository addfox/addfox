import { describe, it, expect, beforeEach } from "@rstest/core";
import { createBrowserPolyfill, getBrowser, isBrowserNative } from "../src/index.js";
import { hasLastArgCallback } from "../src/helpers.js";

function createMockChrome() {
  const onMessageListeners = new Set<(...args: any[]) => any>();

  return {
    _onMessageListeners: onMessageListeners,
    runtime: {
      lastError: undefined as { message: string } | undefined,
      getURL: (path: string) => `chrome-extension://id${path}`,
      sendMessage: (message: unknown, cb: (r: unknown) => void) => {
        cb({ echoed: message });
      },
      onMessage: {
        addListener: (fn: (...args: any[]) => any) => {
          onMessageListeners.add(fn);
        },
        removeListener: (fn: (...args: any[]) => any) => {
          onMessageListeners.delete(fn);
        },
        hasListener: (fn: (...args: any[]) => any) => onMessageListeners.has(fn),
      },
    },
    storage: {
      local: {
        get: (keys: unknown, cb: (r: unknown) => void) => {
          cb({ keys });
        },
        set: (items: unknown, cb?: () => void) => {
          cb?.();
        },
      },
    },
    tabs: {
      query: (query: unknown, cb: (r: unknown) => void) => {
        cb([{ id: 1, ...query }]);
      },
    },
    i18n: {
      getMessage: (messageName: string) => `msg:${messageName}`,
    },
  } as unknown as typeof chrome;
}

describe("createBrowserPolyfill", () => {
  it("promisifies runtime.sendMessage", async () => {
    const chromeApi = createMockChrome();
    const browser = createBrowserPolyfill(chromeApi);
    const result = await browser.runtime.sendMessage({ type: "ping" });
    expect(result).toEqual({ echoed: { type: "ping" } });
  });

  it("promisifies storage.local.get", async () => {
    const chromeApi = createMockChrome();
    const browser = createBrowserPolyfill(chromeApi);
    const result = await browser.storage.local.get("foo");
    expect(result).toEqual({ keys: "foo" });
  });

  it("promisifies tabs.query", async () => {
    const chromeApi = createMockChrome();
    const browser = createBrowserPolyfill(chromeApi);
    const result = await browser.tabs.query({ active: true });
    expect(result).toEqual([{ id: 1, active: true }]);
  });

  it("preserves synchronous methods", () => {
    const chromeApi = createMockChrome();
    const browser = createBrowserPolyfill(chromeApi);
    const url = browser.runtime.getURL("/popup.html");
    expect(url).toBe("chrome-extension://id/popup.html");
  });

  it("rejects when chrome runtime has lastError", async () => {
    const chromeApi = createMockChrome();
    chromeApi.runtime.sendMessage = (_msg, cb) => {
      chromeApi.runtime.lastError = { message: "Something went wrong" };
      cb(undefined);
      chromeApi.runtime.lastError = undefined;
    };

    const browser = createBrowserPolyfill(chromeApi);
    await expect(browser.runtime.sendMessage({})).rejects.toThrow(
      "Something went wrong"
    );
  });

  it("delegates to original when callback is supplied by caller", async () => {
    const chromeApi = createMockChrome();
    const browser = createBrowserPolyfill(chromeApi);
    return new Promise<void>((resolve) => {
      (browser.runtime.sendMessage as any)({ type: "ping" }, (result: unknown) => {
        expect(result).toEqual({ echoed: { type: "ping" } });
        resolve();
      });
    });
  });

  it("wraps events and supports async listeners", async () => {
    const chromeApi = createMockChrome();
    const browser = createBrowserPolyfill(chromeApi);

    const listener = async (_msg: unknown, _sender: unknown) => {
      await Promise.resolve();
      return "async-pong";
    };

    browser.runtime.onMessage.addListener(listener);
    expect(browser.runtime.onMessage.hasListener(listener)).toBe(true);

    const [wrapped] = Array.from(chromeApi._onMessageListeners);
    expect(wrapped).toBeTypeOf("function");

    let response: unknown;
    const keepOpen = wrapped({ type: "ping" }, {}, (r: unknown) => {
      response = r;
    });
    expect(keepOpen).toBe(true);

    await new Promise((r) => setTimeout(r, 10));
    expect(response).toBe("async-pong");

    browser.runtime.onMessage.removeListener(listener);
    expect(browser.runtime.onMessage.hasListener(listener)).toBe(false);
  });

  it("deduplicates event listeners", () => {
    const chromeApi = createMockChrome();
    const browser = createBrowserPolyfill(chromeApi);
    const listener = () => {};

    browser.runtime.onMessage.addListener(listener);
    browser.runtime.onMessage.addListener(listener);
    expect(chromeApi._onMessageListeners.size).toBe(1);
  });

  it("event wrapper catches sync listener errors and sends them", () => {
    const chromeApi = createMockChrome();
    const browser = createBrowserPolyfill(chromeApi);

    const listener = () => {
      throw new Error("sync boom");
    };
    browser.runtime.onMessage.addListener(listener);

    const [wrapped] = Array.from(chromeApi._onMessageListeners);
    let response: unknown;
    const keepOpen = wrapped({}, {}, (r: unknown) => {
      response = r;
    });
    expect(keepOpen).toBe(true);
    expect(response).toEqual({ __error: "sync boom" });
  });

  it("event wrapper catches async listener rejections and sends them", async () => {
    const chromeApi = createMockChrome();
    const browser = createBrowserPolyfill(chromeApi);

    const listener = async () => {
      throw new Error("async boom");
    };
    browser.runtime.onMessage.addListener(listener);

    const [wrapped] = Array.from(chromeApi._onMessageListeners);
    let response: unknown;
    const keepOpen = wrapped({}, {}, (r: unknown) => {
      response = r;
    });
    expect(keepOpen).toBe(true);

    await new Promise((r) => setTimeout(r, 10));
    expect(response).toEqual({ __error: "async boom" });
  });

  it("event hasListener returns false for unknown callback", () => {
    const chromeApi = createMockChrome();
    const browser = createBrowserPolyfill(chromeApi);
    expect(browser.runtime.onMessage.hasListener(() => {})).toBe(false);
  });

  it("event removeListener falls back to original callback when not wrapped", () => {
    const chromeApi = createMockChrome();
    const browser = createBrowserPolyfill(chromeApi);
    const unknown = () => {};
    expect(() => browser.runtime.onMessage.removeListener(unknown)).not.toThrow();
  });

  it("exposes non-special event properties as bound functions", () => {
    const chromeApi = createMockChrome();
    (chromeApi.runtime.onMessage as any).getRules = (cb: (r: unknown) => void) => cb(["rule"]);
    const browser = createBrowserPolyfill(chromeApi);
    const rules = (browser.runtime.onMessage as any).getRules((r: unknown) => r);
    expect(rules).toEqual(["rule"]);
  });

  it("caches wrapped namespace objects", () => {
    const chromeApi = createMockChrome();
    const browser = createBrowserPolyfill(chromeApi);
    const a = browser.storage;
    const b = browser.storage;
    expect(a).toBe(b);

    const c = browser.storage.local;
    const d = browser.storage.local;
    expect(c).toBe(d);
  });

  it("event wrapper returns sync listener result directly", () => {
    const chromeApi = createMockChrome();
    const browser = createBrowserPolyfill(chromeApi);

    const listener = () => "sync-pong";
    browser.runtime.onMessage.addListener(listener);

    const [wrapped] = Array.from(chromeApi._onMessageListeners);
    const result = wrapped({});
    expect(result).toBe("sync-pong");
  });

  it("event wrapper exposes non-function properties unchanged", () => {
    const chromeApi = createMockChrome();
    (chromeApi.runtime.onMessage as any).customProp = 42;
    const browser = createBrowserPolyfill(chromeApi);
    expect((browser.runtime.onMessage as any).customProp).toBe(42);
  });
});

describe("getBrowser / isBrowserNative", () => {
  beforeEach(() => {
    (globalThis as any).browser = undefined;
    (globalThis as any).chrome = undefined;
  });

  it("throws when neither browser nor chrome is available", () => {
    expect(() => getBrowser()).toThrow(/No browser extension API found/);
  });

  it("uses native browser when present", () => {
    const native = { runtime: { sendMessage: () => {} } } as any;
    (globalThis as any).browser = native;
    expect(isBrowserNative()).toBe(true);
    expect(getBrowser()).toBe(native);
  });

  it("falls back to chrome polyfill", () => {
    const chromeApi = createMockChrome();
    (globalThis as any).chrome = chromeApi;
    const browser = getBrowser();
    expect(browser).not.toBe(chromeApi);
  });

  it("default export resolves properties lazily from global chrome", async () => {
    const chromeApi = createMockChrome();
    (globalThis as any).browser = undefined;
    (globalThis as any).chrome = chromeApi;

    // Import the default export after setting the global.
    const mod = await import("../src/index.js");
    const browser = mod.default;
    const url = (browser as any).runtime.getURL("/popup.html");
    expect(url).toBe("chrome-extension://id/popup.html");
  });
});

describe("helpers", () => {
  it("hasLastArgCallback returns true when toString throws", () => {
    const fn = () => {};
    Object.defineProperty(fn, "toString", {
      value() {
        throw new Error("nope");
      },
    });
    expect(hasLastArgCallback(fn)).toBe(true);
  });
});
