import type {
  HookFunction,
  HookPhase,
  HookManagerOptions,
} from './types.js';

/**
 * Generic hook manager - allows users to define their own stages
 * Only provides before/after hooks for additional code execution
 */
export class HookManager<T extends Record<string, unknown> = Record<string, unknown>> {
  private registry = new Map<string, Array<HookFunction<unknown>>>();
  private options: HookManagerOptions;

  constructor(options: HookManagerOptions = {}) {
    this.options = {
      parallel: false,
      bail: false,
      ...options,
    };
  }

  /**
   * Register a hook for a specific stage and phase
   * @param stage - The stage name (user-defined)
   * @param phase - 'before' or 'after'
   * @param handler - The hook function
   * @returns Unregister function
   */
  register<K extends keyof T>(
    stage: K,
    phase: HookPhase,
    handler: HookFunction<T[K]>
  ): () => void {
    const key = this.getKey(stage, phase);
    
    if (!this.registry.has(key)) {
      this.registry.set(key, []);
    }
    
    const hooks = this.registry.get(key)!;
    hooks.push(handler as HookFunction<unknown>);
    
    // Return unregister function
    return () => {
      const index = hooks.indexOf(handler as HookFunction<unknown>);
      if (index > -1) {
        hooks.splice(index, 1);
      }
    };
  }

  /**
   * Execute hooks for a specific stage and phase
   * @param stage - The stage name
   * @param phase - 'before' or 'after'
   * @param payload - Data passed to hooks
   */
  async execute<K extends keyof T>(
    stage: K,
    phase: HookPhase,
    payload: T[K]
  ): Promise<void> {
    const key = this.getKey(stage, phase);
    const hooks = this.registry.get(key) || [];
    
    if (hooks.length === 0) return;
    
    if (this.options.parallel) {
      // Execute in parallel
      if (this.options.bail) {
        await Promise.all(hooks.map((hook) => hook(payload)));
      } else {
        const results = await Promise.allSettled(
          hooks.map((hook) => hook(payload))
        );
        const errors = results
          .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
          .map((r) => r.reason);
        if (errors.length > 0) {
          throw new AggregateError(errors, `Hook execution failed for ${String(stage)}:${phase}`);
        }
      }
    } else {
      // Execute sequentially
      for (const hook of hooks) {
        try {
          await hook(payload);
        } catch (error) {
          if (this.options.bail) {
            throw error;
          }
          console.error(`Hook error in ${String(stage)}:${phase}:`, error);
        }
      }
    }
  }

  /**
   * Check if hooks exist for a stage/phase
   */
  has<K extends keyof T>(stage: K, phase: HookPhase): boolean {
    const key = this.getKey(stage, phase);
    return (this.registry.get(key)?.length || 0) > 0;
  }

  /**
   * Get number of registered hooks for a stage/phase
   */
  count<K extends keyof T>(stage: K, phase: HookPhase): number {
    const key = this.getKey(stage, phase);
    return this.registry.get(key)?.length || 0;
  }

  /**
   * Clear all hooks for a stage/phase, or all hooks if no stage specified
   */
  clear<K extends keyof T>(stage?: K, phase?: HookPhase): void {
    if (stage === undefined) {
      this.registry.clear();
    } else if (phase === undefined) {
      this.registry.delete(this.getKey(stage, 'before'));
      this.registry.delete(this.getKey(stage, 'after'));
    } else {
      this.registry.delete(this.getKey(stage, phase));
    }
  }

  private getKey<K extends keyof T>(stage: K, phase: HookPhase): string {
    return `${String(stage)}:${phase}`;
  }

  /**
   * Get a scoped hook manager for a specific stage
   */
  for<K extends keyof T>(stage: K): StageHookManager<T, K> {
    return new StageHookManager(this, stage);
  }
}

/**
 * Scoped hook manager for a specific stage
 */
export class StageHookManager<
  T extends Record<string, unknown>,
  K extends keyof T
> {
  constructor(
    private manager: HookManager<T>,
    private stage: K
  ) {}

  /**
   * Register a 'before' hook
   */
  before(handler: HookFunction<T[K]>): () => void {
    return this.manager.register(this.stage, 'before', handler);
  }

  /**
   * Register an 'after' hook
   */
  after(handler: HookFunction<T[K]>): () => void {
    return this.manager.register(this.stage, 'after', handler);
  }

  /**
   * Execute 'before' hooks
   */
  async runBefore(payload: T[K]): Promise<void> {
    return this.manager.execute(this.stage, 'before', payload);
  }

  /**
   * Execute 'after' hooks
   */
  async runAfter(payload: T[K]): Promise<void> {
    return this.manager.execute(this.stage, 'after', payload);
  }
}
