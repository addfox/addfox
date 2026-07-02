import { describe, it, expect } from "@rstest/core";
import { createPortChannel } from "../src/index.js";
import type { Browser } from "@addfox/browser";

function createMockBrowserForPort() {
  const portListeners = new Set<(...args: any[]) => any>();
  const disconnectListeners = new Set<(...args: any[]) => any>();
  const posted: unknown[] = [];
  let disconnected = false;

  const port = {
    postMessage: (message: unknown) => {
      if (disconnected) {
        throw new Error("Port is disconnected");
      }
      posted.push(message);
    },
    onMessage: {
      addListener: (fn: (...args: any[]) => any) => portListeners.add(fn),
      removeListener: (fn: (...args: any[]) => any) => portListeners.delete(fn),
      hasListener: (fn: (...args: any[]) => any) => portListeners.has(fn),
    },
    onDisconnect: {
      addListener: (fn: (...args: any[]) => any) => disconnectListeners.add(fn),
      removeListener: (fn: (...args: any[]) => any) =>
        disconnectListeners.delete(fn),
      hasListener: (fn: (...args: any[]) => any) => disconnectListeners.has(fn),
    },
    disconnect: () => {
      if (disconnected) return;
      disconnected = true;
      disconnectListeners.forEach((fn) => fn());
    },
  };

  const runtime = {
    sendMessage: () => Promise.resolve(),
    connect: (_opts: { name?: string }) => port,
    onMessage: {
      addListener: () => {},
      removeListener: () => {},
      hasListener: () => false,
    },
  };

  const browser = { runtime } as unknown as Browser;

  return {
    browser,
    port,
    posted,
    disconnected: () => disconnected,
    dispatch(message: unknown) {
      portListeners.forEach((fn) => fn(message));
    },
    fireDisconnect() {
      disconnectListeners.forEach((fn) => fn());
    },
  };
}

describe("createPortChannel", () => {
  it("posts envelopes with from/to", () => {
    const { browser, posted } = createMockBrowserForPort();
    const channel = createPortChannel({
      from: "content",
      to: "background",
      name: "test-port",
      browser,
    });

    channel.post({ type: "ping" });

    expect(posted).toHaveLength(1);
    const env = posted[0] as any;
    expect(env.__afm).toBe(true);
    expect(env.from).toBe("content");
    expect(env.to).toBe("background");
    expect(env.payload).toEqual({ type: "ping" });
  });

  it("filters incoming port messages by from/to", () => {
    const { browser, dispatch } = createMockBrowserForPort();
    const channel = createPortChannel({
      from: "content",
      to: "background",
      browser,
    });

    const received: unknown[] = [];
    channel.on((payload) => received.push(payload));

    dispatch({ __afm: true, kind: "message", from: "background", to: "content", payload: 1 });
    dispatch({ __afm: true, kind: "message", from: "background", to: "other", payload: 2 });
    dispatch({ __afm: true, kind: "message", from: "other", to: "content", payload: 3 });
    dispatch({ not: "envelope" });

    expect(received).toEqual([1]);
  });

  it("disconnect closes the underlying port", () => {
    const { browser, disconnected } = createMockBrowserForPort();
    const channel = createPortChannel({
      from: "content",
      to: "background",
      browser,
    });

    channel.disconnect();
    expect(disconnected()).toBe(true);
  });

  it("falls back to global browser when no browser is provided", () => {
    const mock = createMockBrowserForPort();
    (globalThis as any).browser = mock.browser;

    try {
      const channel = createPortChannel({
        from: "content",
        to: "background",
      });
      channel.post({ hello: "global" });
      expect(mock.posted).toHaveLength(1);
    } finally {
      (globalThis as any).browser = undefined;
    }
  });

  it("reports connection state", () => {
    const { browser } = createMockBrowserForPort();
    const channel = createPortChannel({
      from: "content",
      to: "background",
      browser,
    });

    expect(channel.isConnected()).toBe(true);
    channel.disconnect();
    expect(channel.isConnected()).toBe(false);
  });

  it("invokes onDisconnect when the port disconnects", () => {
    const { browser, fireDisconnect } = createMockBrowserForPort();
    let called = false;
    createPortChannel({
      from: "content",
      to: "background",
      browser,
      onDisconnect: () => {
        called = true;
      },
    });

    fireDisconnect();
    expect(called).toBe(true);
  });

  it("throws when posting after disconnect", () => {
    const { browser } = createMockBrowserForPort();
    const channel = createPortChannel({
      from: "content",
      to: "background",
      browser,
    });

    channel.disconnect();
    expect(() => channel.post({ type: "late" })).toThrow(/disconnected/);
  });

  it("is safe to disconnect twice", () => {
    const { browser, disconnected } = createMockBrowserForPort();
    const channel = createPortChannel({
      from: "content",
      to: "background",
      browser,
    });

    channel.disconnect();
    channel.disconnect();
    expect(disconnected()).toBe(true);
    expect(channel.isConnected()).toBe(false);
  });

  it("works when the port has no onDisconnect event", () => {
    const posted: unknown[] = [];
    const port = {
      postMessage: (message: unknown) => posted.push(message),
      onMessage: {
        addListener: () => {},
        removeListener: () => {},
        hasListener: () => false,
      },
      disconnect: () => {},
    };
    const browser = {
      runtime: {
        connect: () => port,
      },
    } as unknown as Browser;

    const channel = createPortChannel({
      from: "content",
      to: "background",
      browser,
    });
    channel.post({ hello: "no-disconnect" });
    channel.disconnect();
    expect(posted).toHaveLength(1);
  });
});
