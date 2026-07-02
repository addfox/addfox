/// <reference types="chrome" />

/**
 * Type definitions for the promise-based `browser` API.
 *
 * These types are derived from `@types/chrome` by mapping every method
 * to a Promise-returning equivalent and every `chrome.events.Event` to
 * an event whose listener may return a Promise.
 */

/** Listener accepted by a Browser event: original sync form, promise form, or void form. */
export type BrowserEventListener<F extends (...args: any[]) => any> =
  | F
  | ((...args: Parameters<F>) => Promise<ReturnType<F>> | ReturnType<F> | void);

/** Map a `chrome.events.Event` to a promise-aware event target. */
export type BrowserEvent<T> = T extends chrome.events.Event<infer F>
  ? Omit<T, "addListener" | "removeListener" | "hasListener"> & {
      addListener(callback: BrowserEventListener<F>): void;
      removeListener(callback: BrowserEventListener<F>): void;
      hasListener(callback: BrowserEventListener<F>): boolean;
    }
  : T;

/** Promisify a single function type. */
export type PromisifyFunction<T> = T extends (...args: infer A) => infer R
  ? (...args: A) => R extends Promise<any> ? R : Promise<R>
  : T;

/** Recursively promisify a Chrome namespace object. */
export type BrowserNamespace<T> = {
  [K in keyof T]: T[K] extends chrome.events.Event<any>
    ? BrowserEvent<T[K]>
    : T[K] extends (...args: any[]) => any
      ? PromisifyFunction<T[K]>
      : T[K] extends object
        ? BrowserNamespace<T[K]>
        : T[K];
};

/** Top-level `browser` type: a promise-based mirror of `chrome`. */
export type Browser = BrowserNamespace<typeof chrome> & Record<string, unknown>;
