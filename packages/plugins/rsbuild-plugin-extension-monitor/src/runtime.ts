type AddfoxMonitorOptions = {
  entry: string;
};

type ErrorPayload = {
  type: "error" | "unhandledrejection";
  message: string;
  stack?: string;
  filename?: string;
  lineno?: number;
  colno?: number;
  time: number;
};

const SETUP_KEY = "__ADDFOX_MONITOR_SETUP__";
const WRAP_KEY = "__ADDFOX_LISTENER_WRAPPED__";
const RUNTIME_PROXY_SYMBOL = Symbol.for("addfox.runtime.proxy");

declare const chrome: {
  runtime?: {
    sendMessage?: (msg: unknown) => unknown;
    reload?: () => void;
    onMessage?: {
      addListener: (callback: (message: unknown, sender: unknown, sendResponse: (response?: unknown) => void) => boolean | void) => void;
    };
  };
};
declare const browser: {
  runtime?: {
    sendMessage?: (msg: unknown) => unknown;
    reload?: () => void;
    onMessage?: {
      addListener: (callback: (message: unknown, sender: unknown, sendResponse: (response?: unknown) => void) => boolean | void) => void;
    };
  };
};

type RuntimeApi = {
  sendMessage?: (msg: unknown) => unknown;
  reload?: () => void;
  onMessage?: {
    addListener: (callback: (message: unknown, sender: unknown, sendResponse: (response?: unknown) => void) => boolean | void) => void;
  };
};

function getGlobalObj(): typeof globalThis {
  return typeof globalThis !== "undefined" ? globalThis : ({} as typeof globalThis);
}

function normalizeError(value: unknown): { message: string; stack: string } {
  if (!value) return { message: "Unknown error", stack: "" };
  if (typeof value === "string") return { message: value, stack: "" };
  if (typeof value === "object") {
    const obj = value as { message?: unknown; stack?: unknown };
    const message = obj.message != null ? String(obj.message) : String(value);
    const stack = obj.stack != null ? String(obj.stack) : "";
    return { message: message || "Error", stack };
  }
  return { message: String(value), stack: "" };
}

function getExtensionRoot(): Record<string, unknown> | undefined {
  const g = getGlobalObj() as Record<string, unknown>;
  const chromeRoot = g["chrome"];
  if (isObjectLike(chromeRoot)) return chromeRoot as Record<string, unknown>;
  const browserRoot = g["browser"];
  if (isObjectLike(browserRoot)) return browserRoot as Record<string, unknown>;
  return undefined;
}

function getExtensionRuntime(): RuntimeApi | undefined {
  const root = getExtensionRoot();
  const runtime = root?.runtime;
  return isObjectLike(runtime) ? (runtime as RuntimeApi) : undefined;
}

function safeSendMessage(entry: string, payload: ErrorPayload): void {
  const msg = { __ADDFOX_DEBUG__: true, entry, ...payload };
  if (entry === "background") {
    forwardErrorToDevServer(msg);
    return;
  }
  try {
    const runtime = getExtensionRuntime();
    if (!runtime || typeof runtime.sendMessage !== "function") return;
    const result = runtime.sendMessage(msg);
    const maybeCatch = result as { catch?: (cb: () => void) => void } | undefined;
    if (maybeCatch?.catch) maybeCatch.catch(() => {});
  } catch {}
}

function sendListenerError(entry: string, err: unknown): void {
  const normalized = normalizeError(err);
  safeSendMessage(entry, {
    type: "error",
    message: normalized.message,
    stack: normalized.stack,
    time: Date.now(),
  });
}

/** Report script load/syntax error (e.g. dynamic import failed). Call from background wrapper. */
export function reportLoadError(entry: string, err: unknown): void {
  const normalized = normalizeError(err);
  safeSendMessage(entry, {
    type: "error",
    message: `[Load/Syntax] ${normalized.message}`,
    stack: normalized.stack,
    time: Date.now(),
  });
}

function buildErrorPayload(event: { error?: unknown; message?: unknown; filename?: unknown; lineno?: unknown; colno?: unknown }): ErrorPayload {
  const err = normalizeError(event.error ?? event.message);
  return {
    type: "error",
    message: err.message,
    stack: err.stack,
    filename: event.filename ? String(event.filename) : "",
    lineno: event.lineno ? Number(event.lineno) : 0,
    colno: event.colno ? Number(event.colno) : 0,
    time: Date.now(),
  };
}

function buildRejectionPayload(event: { reason?: unknown }): ErrorPayload {
  const err = normalizeError(event.reason);
  return {
    type: "unhandledrejection",
    message: err.message,
    stack: err.stack,
    time: Date.now(),
  };
}

function attachListeners(entry: string, target: typeof globalThis): void {
  const addListener = (target as { addEventListener?: (type: string, cb: (event: unknown) => void) => void }).addEventListener;
  if (!addListener) return;
  addListener("error", (event) => {
    safeSendMessage(entry, buildErrorPayload(event as { error?: unknown; message?: unknown; filename?: unknown; lineno?: unknown; colno?: unknown }));
  });
  addListener("unhandledrejection", (event) => {
    safeSendMessage(entry, buildRejectionPayload(event as { reason?: unknown }));
  });
}

function isObjectLike(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}

function isListenerTarget(value: unknown): value is { addListener: (...args: unknown[]) => void } & Record<string, unknown> {
  return isObjectLike(value) && typeof (value as { addListener?: unknown }).addListener === "function";
}

function wrapChromeListenerTarget(entry: string, target: { addListener: (...args: unknown[]) => void } & Record<string, unknown>): void {
  if (target[WRAP_KEY]) return;
  target[WRAP_KEY] = true;
  const original = target.addListener;
  target.addListener = function (...args: unknown[]) {
    const cb = args[0];
    if (typeof cb !== "function") return original.apply(this, args as []);
    const wrapped = function (this: unknown, ...cbArgs: unknown[]) {
      try {
        return (cb as (...a: unknown[]) => unknown).apply(this, cbArgs);
      } catch (err) {
        sendListenerError(entry, err);
        throw err;
      }
    };
    const nextArgs = [wrapped, ...args.slice(1)];
    return original.apply(this, nextArgs as []);
  };
}

type ChromeEventTarget = { addListener: (...args: unknown[]) => void } & Record<string, unknown>;

function isChromeEventTarget(value: unknown): value is ChromeEventTarget {
  return isObjectLike(value) && typeof (value as ChromeEventTarget).addListener === "function";
}

function createChromeEventProxy(entry: string, target: ChromeEventTarget): ChromeEventTarget {
  const originalAddListener = target.addListener.bind(target);
  return new Proxy(target, {
    get(orig: ChromeEventTarget, prop: string) {
      if (prop === "addListener") {
        return function addListener(callback: (...args: unknown[]) => unknown): void {
          const wrapped = function (this: unknown, ...args: unknown[]): unknown {
            const first = args[0];
            if (first && typeof first === "object" && (first as Record<string, unknown>).__ADDFOX_DEBUG__ === true) {
              return false;
            }
            try {
              return (callback as (...a: unknown[]) => unknown).apply(this, args);
            } catch (err) {
              sendListenerError(entry, err);
              throw err;
            }
          };
          originalAddListener(wrapped);
        };
      }
      const value = orig[prop];
      return typeof value === "function" ? (value as (...args: unknown[]) => unknown).bind(orig) : value;
    },
  }) as ChromeEventTarget;
}

function createRuntimeProxy(entry: string, runtime: Record<string, unknown>): Record<string, unknown> {
  return new Proxy(runtime, {
    get(orig: Record<string, unknown>, prop: string | symbol) {
      if (prop === RUNTIME_PROXY_SYMBOL) return true;
      const value = orig[prop as string];
      if (isChromeEventTarget(value)) return createChromeEventProxy(entry, value);
      return typeof value === "function" ? (value as (...args: unknown[]) => unknown).bind(orig) : value;
    },
  });
}

function isErrorForwardMessage(msg: unknown): msg is Record<string, unknown> & { entry: string; type: string; message?: string; time?: number } {
  if (!msg || typeof msg !== "object") return false;
  const o = msg as Record<string, unknown>;
  if (o.__ADDFOX_DEBUG__ !== true) return false;
  if (o.type !== "error" && o.type !== "unhandledrejection") return false;
  return true;
}

function getHmrWsPort(): number {
  const g = getGlobalObj() as Record<string, unknown>;
  const port = g["__ADDFOX_WS_PORT__"];
  if (typeof port === "number" && port > 0 && port < 65536) return port;
  return 23333;
}

function forwardErrorToDevServer(payload: Record<string, unknown>): void {
  const port = getHmrWsPort();
  const url = `http://127.0.0.1:${port}/addfox-error`;
  try {
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(() => {});
  } catch {}
}

/** Register in background only: forward __ADDFOX_DEBUG__ error messages to dev server terminal. */
function registerBackgroundErrorForwarder(): void {
  const runtime = getExtensionRuntime() as Record<string, unknown> | undefined;
  if (!runtime) return;
  const onMessage = runtime.onMessage as { addListener: (cb: (msg: unknown) => boolean | void) => void } | undefined;
  if (!onMessage?.addListener) return;
  onMessage.addListener((msg: unknown) => {
    if (!isErrorForwardMessage(msg)) return false;
    forwardErrorToDevServer(msg);
    return false;
  });
}

function patchRuntimeWithProxy(entry: string): void {
  const root = getExtensionRoot();
  if (!root || !root.runtime || typeof root.runtime !== "object") return;
  const current = root.runtime as Record<string, unknown> & { [RUNTIME_PROXY_SYMBOL]?: boolean };
  if (current[RUNTIME_PROXY_SYMBOL]) return;
  const runtime = current;
  const proxy = createRuntimeProxy(entry, runtime);
  try {
    Object.defineProperty(root, "runtime", {
      value: proxy,
      configurable: true,
      enumerable: true,
      writable: false,
    });
  } catch {}
}

function wrapChromeListeners(entry: string): void {
  const root = getExtensionRoot();
  if (!isObjectLike(root)) return;
  const rootRecord = root as Record<string, unknown>;
  for (const key of Object.keys(rootRecord)) {
    if (key === "runtime") continue;
    const ns = rootRecord[key];
    if (isListenerTarget(ns)) wrapChromeListenerTarget(entry, ns);
    if (!isObjectLike(ns)) continue;
    for (const subKey of Object.keys(ns as Record<string, unknown>)) {
      const sub = (ns as Record<string, unknown>)[subKey];
      if (isListenerTarget(sub)) wrapChromeListenerTarget(entry, sub);
    }
  }
}

function markSetup(entry: string, target: typeof globalThis): boolean {
  const store = (target as Record<string, unknown>)[SETUP_KEY];
  if (store && store instanceof Set) {
    if (store.has(entry)) return false;
    store.add(entry);
    return true;
  }
  const next = new Set<string>([entry]);
  (target as Record<string, unknown>)[SETUP_KEY] = next;
  return true;
}

export function setupAddfoxMonitor(options: AddfoxMonitorOptions): void {
  if (!options || !options.entry) return;
  const target = getGlobalObj();
  if (!markSetup(options.entry, target)) return;
  if (options.entry === "background") registerBackgroundErrorForwarder();
  attachListeners(options.entry, target);
  patchRuntimeWithProxy(options.entry);
  wrapChromeListeners(options.entry);
}

/** Default WebSocket port for HMR reload (must match plugin-extension-hmr wsPort). */
export const DEFAULT_HMR_WS_PORT = 23333;

/** Connect to HMR WebSocket; on "reload-extension" call chrome.runtime.reload(). Used by generated background monitor snippet. */
export function startHmrReloadClient(): void {
  const runtime = getExtensionRuntime();
  if (!runtime || typeof runtime.reload !== "function") return;
  const reload = runtime.reload.bind(runtime);
  const port = getHmrWsPort();
  const url = `ws://127.0.0.1:${port}`;
  let ws: WebSocket | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  function connect(): void {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    try {
      ws = new WebSocket(url);
      ws.onmessage = (e) => {
        if (e.data === "reload-extension") reload();
      };
      ws.onclose = () => {
        ws = null;
        if (!reconnectTimer) reconnectTimer = setTimeout(connect, 3000);
      };
      ws.onerror = () => {
        if (ws) ws.close();
      };
    } catch {
      reconnectTimer = setTimeout(connect, 3000);
    }
  }

  connect();
}
