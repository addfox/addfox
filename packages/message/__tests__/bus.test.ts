import { describe, it, expect } from "@rstest/core";
import { defineMessaging, isEnvelope } from "../src/index.js";
import type { Browser } from "@addfox/browser";

function createMockBrowser() {
  const listeners = new Set<(...args: any[]) => any>();
  const sent: unknown[] = [];
  const tabsSent: { tabId: number; message: unknown }[] = [];

  const runtime = {
    sendMessage: (message: unknown) => {
      sent.push(message);
      return Promise.resolve();
    },
    onMessage: {
      addListener: (fn: (...args: any[]) => any) => listeners.add(fn),
      removeListener: (fn: (...args: any[]) => any) => listeners.delete(fn),
      hasListener: (fn: (...args: any[]) => any) => listeners.has(fn),
    },
  };

  const tabs = {
    sendMessage: (tabId: number, message: unknown) => {
      tabsSent.push({ tabId, message });
      return Promise.resolve();
    },
  };

  const browser = { runtime, tabs } as unknown as Browser;

  return {
    browser,
    runtime,
    tabs,
    listeners,
    sent,
    tabsSent,
    dispatch(message: unknown, sender?: unknown) {
      listeners.forEach((fn) => fn(message, sender));
    },
  };
}

describe("defineMessaging", () => {
  it("throws when context is not provided and __addfox__ is absent", () => {
    const { browser } = createMockBrowser();
    expect(() => defineMessaging({ browser })).toThrow(/context/);
  });

  it("send injects type, from, to and marker", async () => {
    const { browser, sent } = createMockBrowser();
    const msg = defineMessaging({
      context: "popup",
      to: "background",
      browser,
    });
    await msg.send("ping", { data: "hello" });

    expect(sent).toHaveLength(1);
    const env = sent[0];
    expect(isEnvelope(env)).toBe(true);
    expect((env as any).type).toBe("ping");
    expect((env as any).from).toBe("popup");
    expect((env as any).to).toBe("background");
    expect((env as any).payload).toEqual({ data: "hello" });
    expect((env as any).kind).toBe("message");
  });

  it("on routes messages by type and filters by to===context", async () => {
    const { browser, dispatch } = createMockBrowser();
    const msg = defineMessaging({ context: "background", browser });

    const received: unknown[] = [];
    msg.on("update", (payload, ctx) => {
      received.push({ payload, ctx });
    });

    dispatch(
      {
        __afm: true,
        kind: "message",
        type: "update",
        from: "popup",
        to: "background",
        payload: 1,
      },
      { tab: { id: 42 } }
    );
    dispatch(
      {
        __afm: true,
        kind: "message",
        type: "update",
        from: "content",
        to: "background",
        payload: 2,
      },
      { tab: { id: 99 } }
    );
    dispatch(
      {
        __afm: true,
        kind: "message",
        type: "other",
        from: "popup",
        to: "background",
        payload: 3,
      }
    );
    dispatch(
      {
        __afm: true,
        kind: "message",
        type: "update",
        from: "popup",
        to: "devtools",
        payload: 4,
      }
    );
    dispatch({ not: "an envelope" });

    await new Promise((r) => setTimeout(r, 10));
    expect(received).toHaveLength(2);
    expect((received[0] as any).payload).toBe(1);
    expect((received[0] as any).ctx.tabId).toBe(42);
    expect((received[1] as any).ctx.tabId).toBe(99);
  });

  it("send uses explicit to over default", async () => {
    const { browser, sent } = createMockBrowser();
    const msg = defineMessaging({
      context: "popup",
      to: "background",
      browser,
    });
    await msg.send("ping", {}, { to: "devtools" });

    expect(sent).toHaveLength(1);
    expect((sent[0] as any).to).toBe("devtools");
  });

  it("send throws when no default to and no explicit to", async () => {
    const { browser } = createMockBrowser();
    const msg = defineMessaging({ context: "popup", browser });
    await expect(msg.send("ping", {})).rejects.toThrow(/to/);
  });

  it("call/register round-trips an RPC request", async () => {
    const mockA = createMockBrowser();
    const mockB = createMockBrowser();

    const msgA = defineMessaging({
      context: "a",
      to: "b",
      browser: mockA.browser,
    });
    const msgB = defineMessaging({ context: "b", browser: mockB.browser });

    msgB.register("add", (x: number, y: number) => x + y);

    mockA.runtime.sendMessage = (message: unknown) => {
      mockB.dispatch(message);
      return Promise.resolve();
    };
    mockB.runtime.sendMessage = (message: unknown) => {
      mockA.dispatch(message);
      return Promise.resolve();
    };

    const result = await msgA.call<number>("b", "add", [2, 3]);
    expect(result).toBe(5);
  });

  it("call rejects when the remote handler throws", async () => {
    const mockA = createMockBrowser();
    const mockB = createMockBrowser();

    const msgA = defineMessaging({
      context: "a",
      to: "b",
      browser: mockA.browser,
    });
    const msgB = defineMessaging({ context: "b", browser: mockB.browser });

    msgB.register("fail", () => {
      throw new Error("boom");
    });

    mockA.runtime.sendMessage = (message: unknown) => {
      mockB.dispatch(message);
      return Promise.resolve();
    };
    mockB.runtime.sendMessage = (message: unknown) => {
      mockA.dispatch(message);
      return Promise.resolve();
    };

    await expect(msgA.call("b", "fail")).rejects.toThrow("boom");
  });

  it("call rejects with generic message when remote rejects with a non-error", async () => {
    const mockA = createMockBrowser();
    const mockB = createMockBrowser();

    const msgA = defineMessaging({
      context: "a",
      to: "b",
      browser: mockA.browser,
    });
    const msgB = defineMessaging({ context: "b", browser: mockB.browser });

    msgB.register("fail", async () => {
      throw "plain string";
    });

    mockA.runtime.sendMessage = (message: unknown) => {
      mockB.dispatch(message);
      return Promise.resolve();
    };
    mockB.runtime.sendMessage = (message: unknown) => {
      mockA.dispatch(message);
      return Promise.resolve();
    };

    await expect(msgA.call("b", "fail")).rejects.toThrow("plain string");
  });

  it("call rejects on timeout", async () => {
    const { browser } = createMockBrowser();
    const msg = defineMessaging({ context: "a", to: "b", browser });

    await expect(
      msg.call("b", "noop", [], { timeout: 50 })
    ).rejects.toThrow(/timed out/);
  });

  it("send routes numeric endpoints through tabs.sendMessage", async () => {
    const { browser, tabsSent } = createMockBrowser();
    const msg = defineMessaging({ context: "background", browser });
    await msg.send("hello", { data: "tab" }, { to: 42 });

    expect(tabsSent).toHaveLength(1);
    expect(tabsSent[0].tabId).toBe(42);
    expect(isEnvelope(tabsSent[0].message)).toBe(true);
  });

  it("on unsubscribe removes the handler", async () => {
    const { browser, dispatch } = createMockBrowser();
    const msg = defineMessaging({ context: "bg", browser });

    const received: unknown[] = [];
    const unsubscribe = msg.on("event", (payload) => received.push(payload));

    dispatch({
      __afm: true,
      kind: "message",
      type: "event",
      from: "a",
      to: "bg",
      payload: 1,
    });
    unsubscribe();
    dispatch({
      __afm: true,
      kind: "message",
      type: "event",
      from: "a",
      to: "bg",
      payload: 2,
    });

    await new Promise((r) => setTimeout(r, 10));
    expect(received).toEqual([1]);
  });

  it("register unsubscribe removes the rpc handler", async () => {
    const { browser, dispatch, runtime } = createMockBrowser();
    const msg = defineMessaging({ context: "b", browser });

    const unregister = msg.register("echo", (x: string) => x);
    unregister();

    runtime.sendMessage = (message: unknown) => {
      dispatch(message);
      return Promise.resolve();
    };

    const msgA = defineMessaging({ context: "a", to: "b", browser });
    await expect(msgA.call("b", "echo", [], { timeout: 50 })).rejects.toThrow(
      /METHOD_NOT_FOUND|not registered/
    );
  });

  it("call rejects when sendEnvelope fails", async () => {
    const { browser, runtime } = createMockBrowser();
    runtime.sendMessage = () => Promise.reject(new Error("send failed"));
    const msg = defineMessaging({ context: "a", to: "b", browser });

    await expect(msg.call("b", "x")).rejects.toThrow("send failed");
  });

  it("ignores rpc responses not matching the pending id", async () => {
    const { browser, dispatch } = createMockBrowser();
    const msg = defineMessaging({ context: "a", to: "b", browser });

    msg.call("b", "x", [], { timeout: 50 }).catch(() => {});

    dispatch({
      __afm: true,
      kind: "response",
      from: "c",
      to: "a",
      id: "wrong-id",
      payload: { result: "should not fulfill" },
    });

    await new Promise((r) => setTimeout(r, 10));
  });

  it("sendEnvelope throws when tabs.sendMessage is missing for numeric endpoint", async () => {
    const { browser } = createMockBrowser();
    (browser as any).tabs = undefined;
    const msg = defineMessaging({ context: "bg", browser });

    await expect(msg.send("x", {}, { to: 42 })).rejects.toThrow(
      "tabs.sendMessage is not available"
    );
  });

  it("reads context from __addfox__ when available", () => {
    (globalThis as any).__addfox__ = { context: "injected-content" };
    try {
      const { browser } = createMockBrowser();
      const msg = defineMessaging({ browser });
      expect(msg).toBeDefined();
    } finally {
      delete (globalThis as any).__addfox__;
    }
  });

  it("broadcast delivers to all contexts matching the type", async () => {
    const { browser, dispatch, sent } = createMockBrowser();
    const msgBg = defineMessaging({ context: "background", browser });
    const msgPopup = defineMessaging({ context: "popup", browser });

    const bgReceived: unknown[] = [];
    const popupReceived: unknown[] = [];
    msgBg.on("notify", (payload) => bgReceived.push(payload));
    msgPopup.on("notify", (payload) => popupReceived.push(payload));

    await msgBg.broadcast("notify", { data: 1 });

    expect(sent).toHaveLength(1);
    expect((sent[0] as any).to).toBe("*");

    dispatch(sent[0]);

    await new Promise((r) => setTimeout(r, 10));
    expect(bgReceived).toEqual([{ data: 1 }]);
    expect(popupReceived).toEqual([{ data: 1 }]);
  });

  it("on filters messages by sender endpoint", async () => {
    const { browser, dispatch } = createMockBrowser();
    const msg = defineMessaging({ context: "background", browser });

    const received: unknown[] = [];
    msg.on(
      "update",
      (payload, ctx) => received.push({ payload, from: ctx.from }),
      { from: "popup" }
    );

    dispatch({
      __afm: true,
      kind: "message",
      type: "update",
      from: "popup",
      to: "background",
      payload: 1,
    });
    dispatch({
      __afm: true,
      kind: "message",
      type: "update",
      from: "content",
      to: "background",
      payload: 2,
    });

    await new Promise((r) => setTimeout(r, 10));
    expect(received).toEqual([{ payload: 1, from: "popup" }]);
  });

  it("on supports an array of sender endpoints", async () => {
    const { browser, dispatch } = createMockBrowser();
    const msg = defineMessaging({ context: "background", browser });

    const received: string[] = [];
    msg.on(
      "update",
      (_payload, ctx) => received.push(ctx.from as string),
      { from: ["popup", "devtools"] }
    );

    dispatch({
      __afm: true,
      kind: "message",
      type: "update",
      from: "popup",
      to: "background",
      payload: null,
    });
    dispatch({
      __afm: true,
      kind: "message",
      type: "update",
      from: "devtools",
      to: "background",
      payload: null,
    });
    dispatch({
      __afm: true,
      kind: "message",
      type: "update",
      from: "content",
      to: "background",
      payload: null,
    });

    await new Promise((r) => setTimeout(r, 10));
    expect(received).toEqual(["popup", "devtools"]);
  });

  it("once removes the handler after the first message", async () => {
    const { browser, dispatch } = createMockBrowser();
    const msg = defineMessaging({ context: "background", browser });

    const received: unknown[] = [];
    msg.once("event", (payload) => received.push(payload));

    dispatch({
      __afm: true,
      kind: "message",
      type: "event",
      from: "a",
      to: "background",
      payload: 1,
    });
    dispatch({
      __afm: true,
      kind: "message",
      type: "event",
      from: "a",
      to: "background",
      payload: 2,
    });

    await new Promise((r) => setTimeout(r, 10));
    expect(received).toEqual([1]);
  });

  it("call rejects with METHOD_NOT_FOUND when remote handler is missing", async () => {
    const mockA = createMockBrowser();
    const mockB = createMockBrowser();

    const msgA = defineMessaging({
      context: "a",
      to: "b",
      browser: mockA.browser,
    });
    defineMessaging({ context: "b", browser: mockB.browser });

    mockA.runtime.sendMessage = (message: unknown) => {
      mockB.dispatch(message);
      return Promise.resolve();
    };
    mockB.runtime.sendMessage = (message: unknown) => {
      mockA.dispatch(message);
      return Promise.resolve();
    };

    await expect(msgA.call("b", "missing", [])).rejects.toThrow(
      /METHOD_NOT_FOUND|not registered/
    );
  });

  it("typed RPC round-trips with inferred params and return type", async () => {
    const mockA = createMockBrowser();
    const mockB = createMockBrowser();

    interface MyRpc {
      multiply(a: number, b: number): number;
    }

    const msgA = defineMessaging<Record<string, never>, MyRpc>({
      context: "a",
      to: "b",
      browser: mockA.browser,
    });
    const msgB = defineMessaging<Record<string, never>, MyRpc>({
      context: "b",
      browser: mockB.browser,
    });

    msgB.register("multiply", (a, b) => a * b);

    mockA.runtime.sendMessage = (message: unknown) => {
      mockB.dispatch(message);
      return Promise.resolve();
    };
    mockB.runtime.sendMessage = (message: unknown) => {
      mockA.dispatch(message);
      return Promise.resolve();
    };

    const result = await msgA.call("b", "multiply", [3, 4]);
    expect(result).toBe(12);
  });
});
