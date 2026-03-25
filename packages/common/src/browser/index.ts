/**
 * Browser runtime wrapping utilities
 * 
 * These utilities wrap browser extension APIs to capture errors from
 * event listener callbacks, forwarding them to the error monitoring system.
 * 
 * @example
 * ```typescript
 * import browser from 'webextension-polyfill';
 * import { wrapBrowser } from '@addfox/common/browser';
 * 
 * const wrapped = wrapBrowser(browser, (err) => {
 *   console.error('Listener error:', err);
 * });
 * 
 * wrapped.runtime.onMessage.addListener((msg) => {
 *   // Errors here will be caught and forwarded
 * });
 * ```
 */

export { wrapBrowser, normalizeError } from "./wrapRuntime.js";
export type {
  WrappedError,
  ErrorHandler,
  EventTargetWithAddListener,
  RuntimeLike,
  BrowserLike,
  WrapTarget,
} from "./types.js";
