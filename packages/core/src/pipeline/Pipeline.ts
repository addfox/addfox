import type { HookManager } from '@addfox/common';
import type { PipelineContext } from './types.js';

/**
 * Pipeline - orchestrates build flow with hook points
 * Uses external HookManager for hook storage/execution
 */
export class Pipeline {
  constructor(private hooks: HookManager<Record<string, PipelineContext>>) {}

  /**
   * Execute the full pipeline flow
   */
  async execute(root: string, argv: string[]): Promise<PipelineContext> {
    let context: PipelineContext = { root, argv } as PipelineContext;

    try {
      // Stage: init
      await this.runStage('init', context);

      // Stage: options
      await this.runStage('options', context);

      // Stage: parse
      await this.runStage('parse', context);

      // Stage: load - config and entries should be loaded here
      await this.runStage('load', context);

      // Stage: resolve - resolve final context values
      await this.runStage('resolve', context);

      // Stage: prepare - prepare rsbuild config
      await this.runStage('prepare', context);

      // Stage: build - build rsbuild config
      await this.runStage('build', context);
    } catch (error) {
      // Stage: complete with error
      await this.runStage('complete', context);
      throw error;
    }

    // Stage: complete
    await this.runStage('complete', context);

    return context;
  }

  /**
   * Run before/after hooks for a stage
   */
  private async runStage(stage: string, payload: PipelineContext): Promise<void> {
    await this.hooks.execute(stage, 'before', payload);
    await this.hooks.execute(stage, 'after', payload);
  }
}
