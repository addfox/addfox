import { wrapBrowser, normalizeError, type BrowserLike } from "@addfox/common/browser";

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
const ERROR_HANDLER_KEY = "__ADDFOX_SEND_ERROR__";

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

function sendListenerError(entry: string, err: { message: string; stack?: string; time: number }): void {
  safeSendMessage(entry, {
    type: "error",
    message: err.message,
    stack: err.stack,
    time: err.time,
  });
}

/** Check if message is from monitor itself (avoid infinite loop) */
function isMonitorInternal(firstArg: unknown): boolean {
  return (
    firstArg !== null &&
    typeof firstArg === "object" &&
    (firstArg as Record<string, unknown>).__ADDFOX_DEBUG__ === true
  );
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

/** Create error handler that forwards to dev server */
function createErrorHandler(entry: string) {
  return (err: { message: string; stack?: string; time: number }) => {
    sendListenerError(entry, err);
  };
}

function wrapChromeListenerTarget(entry: string, target: { addListener: (...args: unknown[]) => void } & Record<string, unknown>): void {
  if (target[WRAP_KEY]) return;
  target[WRAP_KEY] = true;
  const original = target.addListener;
  const handler = createErrorHandler(entry);
  target.addListener = function (...args: unknown[]) {
    const cb = args[0];
    if (typeof cb !== "function") return original.apply(this, args as []);
    const wrapped = function (this: unknown, ...cbArgs: unknown[]) {
      try {
        return (cb as (...a: unknown[]) => unknown).apply(this, cbArgs);
      } catch (err) {
        const normalized = normalizeError(err);
        handler(normalized);
        throw err;
      }
    };
    const nextArgs = [wrapped, ...args.slice(1)];
    return original.apply(this, nextArgs as []);
  };
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

function registerErrorForwarderForRuntime(runtime: Record<string, unknown> | undefined): void {
  if (!runtime) return;
  const onMessage = runtime.onMessage as { addListener: (cb: (msg: unknown) => boolean | void) => void } | undefined;
  if (!onMessage?.addListener) return;
  onMessage.addListener((msg: unknown) => {
    if (!isErrorForwardMessage(msg)) return false;
    forwardErrorToDevServer(msg);
    return false;
  });
}

/** Register in background only: forward __ADDFOX_DEBUG__ error messages to dev server terminal. */
function registerBackgroundErrorForwarder(): void {
  const g = getGlobalObj() as Record<string, unknown>;
  // Register for both chrome and browser runtimes
  const chromeRoot = g["chrome"];
  const browserRoot = g["browser"];
  if (isObjectLike(chromeRoot) && isObjectLike(chromeRoot.runtime)) {
    registerErrorForwarderForRuntime(chromeRoot.runtime as Record<string, unknown>);
  }
  if (isObjectLike(browserRoot) && isObjectLike(browserRoot.runtime)) {
    registerErrorForwarderForRuntime(browserRoot.runtime as Record<string, unknown>);
  }
}

function patchRuntimeWithProxyForRoot(
  entry: string,
  root: Record<string, unknown> | undefined
): void {
  if (!root) return;
  
  // Use wrapBrowser from @addfox/common
  const handler = createErrorHandler(entry);
  const wrappedRoot = wrapBrowser(root as BrowserLike, handler, { isMonitorInternal });
  
  // Copy wrapped runtime back to root
  const wrappedRuntime = (wrappedRoot as BrowserLike).runtime;
  if (wrappedRuntime && typeof wrappedRuntime === "object") {
    Object.defineProperty(root, "runtime", {
      value: wrappedRuntime,
      configurable: true,
      enumerable: true,
      writable: false,
    });
  }
}

function patchRuntimeWithProxy(entry: string): void {
  const g = getGlobalObj() as Record<string, unknown>;
  // Patch both chrome and browser namespaces
  const chromeRoot = g["chrome"];
  const browserRoot = g["browser"];
  if (isObjectLike(chromeRoot)) {
    patchRuntimeWithProxyForRoot(entry, chromeRoot as Record<string, unknown>);
  }
  if (isObjectLike(browserRoot)) {
    patchRuntimeWithProxyForRoot(entry, browserRoot as Record<string, unknown>);
  }
}

function wrapChromeListenersForRoot(entry: string, root: Record<string, unknown> | undefined): void {
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

function wrapChromeListeners(entry: string): void {
  console.log('------runtime');
  const g = getGlobalObj() as Record<string, unknown>;
  // Wrap listeners for both chrome and browser namespaces
  const chromeRoot = g["chrome"];
  const browserRoot = g["browser"];
  if (isObjectLike(chromeRoot)) {
    wrapChromeListenersForRoot(entry, chromeRoot as Record<string, unknown>);
  }
  console.log('browserRoot', browserRoot, chromeRoot)
  if (isObjectLike(browserRoot)) {
    
    wrapChromeListenersForRoot(entry, browserRoot as Record<string, unknown>);
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
  
  // Set up global error handler for utils/browser to use
  const handler = createErrorHandler(options.entry);
  (target as Record<string, unknown>)[ERROR_HANDLER_KEY] = (err: unknown) => {
    const normalized = normalizeError(err);
    handler(normalized);
  };
  
  if (options.entry === "background") registerBackgroundErrorForwarder();
  attachListeners(options.entry, target);
  patchRuntimeWithProxy(options.entry);
  wrapChromeListeners(options.entry);
}

/**
 * Get the entry name that was set up by setupAddfoxMonitor.
 * Returns null if setupAddfoxMonitor hasn't been called yet.
 */
function getSetupEntry(): string | null {
  const target = getGlobalObj();
  const store = (target as Record<string, unknown>)[SETUP_KEY];
  if (store && store instanceof Set && store.size > 0) {
    return Array.from(store as Set<string>)[0] ?? null;
  }
  return null;
}

/**
 * Wrap an imported browser object (e.g., from webextension-polyfill) to capture listener errors.
 * Usage:
 *   import browser from 'webextension-polyfill';
 *   const monitoredBrowser = wrapImportedBrowser(browser);
 *   monitoredBrowser.runtime.onMessage.addListener((msg) => { ... });
 */
export function wrapImportedBrowser<T extends Record<string, unknown>>(browserObj: T): T {
  const entry = getSetupEntry();
  if (!entry) {
    // setupAddfoxMonitor not called yet, return original
    return browserObj;
  }
  
  const handler = createErrorHandler(entry);
  return wrapBrowser(browserObj as BrowserLike, handler, { isMonitorInternal }) as T;
}

/**
 * Wrap an imported runtime object directly to capture listener errors.
 * Usage:
 *   import browser from 'webextension-polyfill';
 *   const runtime = wrapImportedRuntime(browser.runtime);
 *   runtime.onMessage.addListener((msg) => { ... });
 */
export function wrapImportedRuntime<T extends Record<string, unknown>>(runtime: T): T {
  const entry = getSetupEntry();
  if (!entry) {
    // setupAddfoxMonitor not called yet, return original
    return runtime;
  }
  
  // Create a minimal browser-like object with just the runtime
  const handler = createErrorHandler(entry);
  const browserLike = { runtime: runtime as BrowserLike["runtime"] };
  const wrapped = wrapBrowser(browserLike, handler, { isMonitorInternal });
  return (wrapped as { runtime: T }).runtime;
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
