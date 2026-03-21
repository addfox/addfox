/**
 * Hook types for the generic hook system
 */

/** Base hook function type */
export type HookFunction<T = void> = T extends void
  ? () => void | Promise<void>
  : (payload: T) => void | Promise<void>;

/** Hook registry - stores hooks by name */
export type HookRegistry<T extends Record<string, unknown> = Record<string, unknown>> = {
  [K in keyof T]?: Array<HookFunction<T[K]>>;
};

/** Hook phase types */
export type HookPhase = 'before' | 'after';

/** Hook descriptor */
export interface HookDescriptor<T = unknown> {
  name: string;
  phase: HookPhase;
  handler: HookFunction<T>;
  priority?: number;
}

/** Hook manager options */
export interface HookManagerOptions {
  /** Whether to run hooks in parallel (default: false - sequential) */
  parallel?: boolean;
  /** Whether to stop on first error (default: false) */
  bail?: boolean;
}
