import type { RsbuildConfig } from '@rsbuild/core';
import type { BrowserTarget, CliCommand } from '../constants.js';
import type { AddfoxResolvedConfig, EntryInfo } from '../types.js';

/**
 * Pipeline context passed through all stages
 */
export interface PipelineContext {
  root: string;
  command: CliCommand;
  browser: BrowserTarget;
  cache?: boolean;
  report?: boolean | Record<string, unknown>;
  config: AddfoxResolvedConfig;
  baseEntries: EntryInfo[];
  entries: EntryInfo[];
  rsbuild: RsbuildConfig;
  isDev: boolean;
  distPath: string;
  argv?: string[];
}

/**
 * Pipeline stage names
 */
export type PipelineStage = 
  | 'init'
  | 'options' 
  | 'parse'
  | 'load'
  | 'resolve'
  | 'prepare'
  | 'build'
  | 'complete';

/** Hook function type for pipeline */
export type PipelineHook = (ctx: PipelineContext) => void | Promise<void>;
