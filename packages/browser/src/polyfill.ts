import { isEventLike, isFunction, hasLastArgCallback } from "./helpers.js";
import { wrapEvent } from "./event.js";
import type { Browser } from "./types.js";

const namespaceCache = new WeakMap<object, unknown>();

function wrapMethod(
  fn: (...args: any[]) => any,
  thisArg: object,
  chromeRoot: typeof chrome
) {
  return function wrappedMethod(this: unknown, ...args: any[]): unknown {
    const lastArg = args[args.length - 1];

    // If the caller explicitly passed a callback, delegate directly.
    if (args.length > 0 && isFunction(lastArg)) {
      return fn.apply(thisArg, args);
    }

    // If the method signature does not mention a callback, call synchronously.
    if (!hasLastArgCallback(fn)) {
      return fn.apply(thisArg, args);
    }

    return new Promise((resolve, reject) => {
      fn.call(thisArg, ...args, (result: unknown) => {
        const err = chromeRoot.runtime?.lastError;
        if (err) {
          reject(new Error(err.message));
        } else {
          resolve(result);
        }
      });
    });
  };
}

function wrapNamespace(target: unknown, chromeRoot: typeof chrome): unknown {
  if (!isObject(target)) return target;
  if (namespaceCache.has(target)) return namespaceCache.get(target);

  const proxy = new Proxy(target, {
    get(t, prop) {
      const value = (t as Record<string | symbol, unknown>)[prop];

      if (isEventLike(value)) {
        return wrapEvent(value);
      }

      if (isFunction(value)) {
        return wrapMethod(value, t as object, chromeRoot);
      }

      if (isObject(value)) {
        return wrapNamespace(value, chromeRoot);
      }

      return value;
    },
  });

  namespaceCache.set(target, proxy);
  return proxy;
}

function isObject(value: unknown): value is Record<string | symbol, unknown> {
  return value !== null && typeof value === "object";
}

/**
 * Create a promise-based `browser` object from a callback-style `chrome` object.
 *
 * @example
 * ```ts
 * import { createBrowserPolyfill } from "@addfox/browser";
 * const browser = createBrowserPolyfill(chrome);
 * await browser.storage.local.get("key");
 * ```
 */
export function createBrowserPolyfill(chromeApi: typeof chrome): Browser {
  return wrapNamespace(chromeApi, chromeApi) as Browser;
}
