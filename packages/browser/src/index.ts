/**
 * @addfox/browser
 *
 * Type-safe, promise-based browser extension API polyfill.
 * Drop-in replacement for `webextension-polyfill` with full TypeScript
 * coverage derived from `@types/chrome`.
 */

export { createBrowserPolyfill } from "./polyfill.js";
export { getBrowser, isBrowserNative } from "./detect.js";
export { wrapEvent } from "./event.js";
export type { Browser, BrowserEvent, BrowserEventListener, BrowserNamespace } from "./types.js";

import { getBrowser } from "./detect.js";
import type { Browser } from "./types.js";

/**
 * Default browser singleton.
 *
 * Accessing any property lazily resolves the underlying `browser` or `chrome`
 * global so that importing the module does not throw in non-extension contexts.
 */
const browser = new Proxy({} as Browser, {
  get(_target, prop) {
    return (getBrowser() as Record<string | symbol, unknown>)[prop];
  },
});
export default browser;
