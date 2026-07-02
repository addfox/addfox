import { isFunction, isPromiseLike } from "./helpers.js";
import type { BrowserEvent } from "./types.js";

const listenerMap = new WeakMap<
  (...args: any[]) => any,
  (...args: any[]) => any
>();

export function wrapEvent<E extends chrome.events.Event<any>>(
  event: E
): BrowserEvent<E> {
  return new Proxy(event, {
    get(target, prop) {
      const value = (target as any)[prop];

      if (prop === "addListener" && isFunction(value)) {
        return (callback: (...args: any[]) => any, ...extras: unknown[]) => {
          if (listenerMap.has(callback)) {
            return;
          }

          const wrapped = function wrappedListener(
            this: unknown,
            ...args: any[]
          ): unknown {
            try {
              const result = callback.apply(this, args);

              if (isPromiseLike(result)) {
                const lastArg = args[args.length - 1];
                const sendResponse =
                  args.length > 0 && isFunction(lastArg) ? lastArg : undefined;

                if (sendResponse) {
                  result.then(
                    (value) => sendResponse(value),
                    (err: unknown) =>
                      sendResponse({
                        __error: err instanceof Error ? err.message : String(err),
                      })
                  );
                }

                // Keep the message channel open for async response.
                return true;
              }

              return result;
            } catch (err) {
              const lastArg = args[args.length - 1];
              const sendResponse =
                args.length > 0 && isFunction(lastArg) ? lastArg : undefined;
              if (sendResponse) {
                sendResponse({
                  __error: err instanceof Error ? err.message : String(err),
                });
              }
              return true;
            }
          };

          listenerMap.set(callback, wrapped);
          return value.call(target, wrapped, ...extras);
        };
      }

      if (prop === "removeListener" && isFunction(value)) {
        return (callback: (...args: any[]) => any) => {
          const wrapped = listenerMap.get(callback);
          if (wrapped) {
            listenerMap.delete(callback);
            return value.call(target, wrapped);
          }
          return value.call(target, callback);
        };
      }

      if (prop === "hasListener" && isFunction(value)) {
        return (callback: (...args: any[]) => any) => {
          const wrapped = listenerMap.get(callback);
          return value.call(target, wrapped ?? callback);
        };
      }

      if (isFunction(value)) {
        return value.bind(target);
      }

      return value;
    },
  }) as unknown as BrowserEvent<E>;
}
