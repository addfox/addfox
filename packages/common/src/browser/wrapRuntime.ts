/**
 * Browser runtime wrapping utilities for error monitoring
 * Used by both @addfox/utils and @addfox/rsbuild-plugin-extension-monitor
 */

import type {
  ErrorHandler,
  WrappedError,
  EventTargetWithAddListener,
  RuntimeLike,
} from "./types.js";

/** Symbol to mark already wrapped objects */
const WRAP_SYMBOL = Symbol.for("addfox.runtime.wrapped");

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  if (!value || (typeof value !== "object" && typeof value !== "function")) return false;
  return typeof (value as { then?: unknown }).then === "function";
}

/** Check if an object has addListener method */
function hasAddListener(obj: unknown): obj is EventTargetWithAddListener {
  return (
    obj !== null &&
    typeof obj === "object" &&
    typeof (obj as EventTargetWithAddListener).addListener === "function"
  );
}

/** Normalize error to WrappedError */
export function normalizeError(value: unknown): WrappedError {
  if (!value) {
    return { message: "Unknown error", time: Date.now() };
  }
  if (typeof value === "string") {
    return { message: value, time: Date.now() };
  }
  if (typeof value === "object") {
    const obj = value as { message?: unknown; stack?: unknown };
    const message =
      obj.message != null ? String(obj.message) : String(value);
    const stack = obj.stack != null ? String(obj.stack) : undefined;
    return { message: message || "Error", stack, time: Date.now() };
  }
  return { message: String(value), time: Date.now() };
}

/** Wrap a callback to catch errors */
function wrapCallback(
  callback: (...args: unknown[]) => unknown,
  onError: ErrorHandler,
  isMonitorInternal: (firstArg: unknown) => boolean = () => false
): (...args: unknown[]) => unknown {
  return function wrappedCallback(this: any, ...args: unknown[]): unknown {
    // Skip addfox internal messages
    const first = args[0];
    if (first && typeof first === "object" && isMonitorInternal(first)) {
      return undefined;
    }

    try {
      const result = callback.apply(this, args);
      if (!isPromiseLike(result)) return result;
      return result.then(
        (v) => v,
        (err: unknown) => {
          onError(normalizeError(err));
          throw err;
        }
      );
    } catch (err) {
      onError(normalizeError(err));
      throw err;
    }
  };
}

/** Wrap an event target (like onMessage, onConnect) */
function wrapEventTarget(
  target: EventTargetWithAddListener,
  onError: ErrorHandler,
  isMonitorInternal?: (firstArg: unknown) => boolean
): EventTargetWithAddListener {
  if ((target as { [WRAP_SYMBOL]?: boolean })[WRAP_SYMBOL]) {
    return target;
  }

  const originalAddListener = target.addListener.bind(target);
  const originalRemoveListener = target.removeListener?.bind(target);
  const originalHasListener = target.hasListener?.bind(target);

  const wrappedTarget: EventTargetWithAddListener = {
    addListener(callback: (...args: unknown[]) => unknown, ...rest: unknown[]) {
      const wrapped = wrapCallback(callback, onError, isMonitorInternal);
      return originalAddListener(wrapped, ...rest);
    },
  };

  if (originalRemoveListener) {
    wrappedTarget.removeListener = originalRemoveListener;
  }
  if (originalHasListener) {
    wrappedTarget.hasListener = originalHasListener;
  }

  Object.defineProperty(wrappedTarget, WRAP_SYMBOL, {
    value: true,
    writable: false,
    enumerable: false,
    configurable: true,
  });

  return wrappedTarget;
}

/** Wrap runtime object */
function wrapRuntime(
  runtime: RuntimeLike,
  onError: ErrorHandler,
  isMonitorInternal?: (firstArg: unknown) => boolean
): RuntimeLike {
  if ((runtime as { [WRAP_SYMBOL]?: boolean })[WRAP_SYMBOL]) {
    return runtime;
  }

  const wrapped = new Proxy(runtime, {
    get(target, prop) {
      const value = target[prop as string];
      if (hasAddListener(value)) {
        return wrapEventTarget(value, onError, isMonitorInternal);
      }
      return typeof value === "function" ? value.bind(target) : value;
    },
  }) as RuntimeLike;

  Object.defineProperty(wrapped, WRAP_SYMBOL, {
    value: true,
    writable: false,
    enumerable: false,
    configurable: true,
  });

  return wrapped;
}

/**
 * Wrap a browser object to capture errors from event listeners
 * @param browser - The browser object (from webextension-polyfill or similar)
 * @param onError - Error handler callback
 * @param options - Additional options
 * @returns Wrapped browser object
 */
export function wrapBrowser<T extends Record<string, unknown>>(
  browser: T,
  onError: ErrorHandler,
  options?: {
    /** Function to identify internal monitor messages that should not be wrapped */
    isMonitorInternal?: (firstArg: unknown) => boolean;
  }
): T {
  if ((browser as { [WRAP_SYMBOL]?: boolean })[WRAP_SYMBOL]) {
    return browser;
  }

  const wrapped = new Proxy(browser, {
    get(target, prop) {
      const value = target[prop as string];
      if (prop === "runtime" && value && typeof value === "object") {
        return wrapRuntime(
          value as RuntimeLike,
          onError,
          options?.isMonitorInternal
        );
      }
      return typeof value === "function" ? value.bind(target) : value;
    },
  }) as T;

  Object.defineProperty(wrapped, WRAP_SYMBOL, {
    value: true,
    writable: false,
    enumerable: false,
    configurable: true,
  });

  return wrapped;
}
