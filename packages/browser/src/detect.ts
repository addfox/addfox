import { createBrowserPolyfill } from "./polyfill.js";
import type { Browser } from "./types.js";

function isBrowserLike(value: unknown): value is Browser {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Record<string, unknown>).runtime === "object" &&
    typeof ((value as Record<string, unknown>).runtime as Record<string, unknown>)
      ?.sendMessage === "function"
  );
}

/**
 * Detect whether the environment already provides a native promise-based
 * `browser` global (Firefox / Safari).
 */
export function isBrowserNative(): boolean {
  return (
    typeof globalThis !== "undefined" &&
    isBrowserLike((globalThis as Record<string, unknown>).browser)
  );
}

/**
 * Get the best available `browser` object.
 *
 * Prefers a native `globalThis.browser` and falls back to a polyfill
 * created from `globalThis.chrome`.
 */
export function getBrowser(): Browser {
  const g = globalThis as Record<string, unknown>;

  if (typeof globalThis !== "undefined" && isBrowserLike(g.browser)) {
    return g.browser as Browser;
  }

  if (
    typeof globalThis !== "undefined" &&
    typeof g.chrome === "object" &&
    g.chrome !== null
  ) {
    return createBrowserPolyfill(g.chrome as unknown as typeof chrome);
  }

  throw new Error(
    "@addfox/browser: No browser extension API found. This code must run inside an extension context."
  );
}
