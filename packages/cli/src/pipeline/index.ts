/**
 * Addfox CLI pipeline
 */

export { Pipeline, runPipeline } from './Pipeline.ts';
export type { PipelineOptions } from './Pipeline.ts';

// Re-export types from core
export type { PipelineContext, PipelineStage } from '@addfox/core/pipeline';
