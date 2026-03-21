/**
 * Generic hook system - allows users to define their own stages
 * Provides only before/after hooks for additional code execution
 */

export { HookManager, StageHookManager } from './HookManager.js';
export type {
  HookFunction,
  HookRegistry,
  HookPhase,
  HookDescriptor,
  HookManagerOptions,
} from './types.ts';
