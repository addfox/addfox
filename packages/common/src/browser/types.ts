/**
 * Types for browser runtime wrapping
 */

/** Error information captured from callbacks */
export interface WrappedError {
  message: string;
  stack?: string;
  time: number;
}

/** Error handler callback type */
export type ErrorHandler = (error: WrappedError) => void;

/** Generic callback function */
export type GenericCallback = (...args: unknown[]) => unknown;

/** Event target with addListener - accepts any function as callback */
export interface EventTargetWithAddListener {
  addListener: (callback: (...args: unknown[]) => unknown, ...args: unknown[]) => void;
  removeListener?: (callback: (...args: unknown[]) => unknown) => void;
  hasListener?: (callback: (...args: unknown[]) => unknown) => boolean;
}

/** Runtime object structure with flexible types */
export interface RuntimeLike {
  onMessage?: EventTargetWithAddListener;
  onConnect?: EventTargetWithAddListener;
  sendMessage?: (...args: unknown[]) => unknown;
  [key: string]: unknown;
}

/** Browser object structure with flexible types */
export interface BrowserLike {
  runtime?: RuntimeLike;
  storage?: Record<string, unknown>;
  tabs?: Record<string, unknown>;
  [key: string]: unknown;
}

/** Any object that can be wrapped (accepts browser polyfill types) */
export type WrapTarget = BrowserLike | Record<string, unknown>;
