import { describe, it, expect } from '@rstest/core';
import { HookManager } from '../src/hooks/HookManager.js';

describe('HookManager', () => {
  it('creates with default options', () => {
    const hooks = new HookManager();
    expect(hooks).toBeInstanceOf(HookManager);
  });

  it('creates with custom options', () => {
    const hooks = new HookManager({ parallel: true, bail: true });
    expect(hooks).toBeInstanceOf(HookManager);
  });

  it('registers and executes hooks', async () => {
    const hooks = new HookManager();
    const order: string[] = [];

    hooks.register('test', 'before', async () => {
      order.push('before');
    });

    await hooks.execute('test', 'before', {});
    expect(order).toEqual(['before']);
  });

  it('registers multiple hooks for same stage', async () => {
    const hooks = new HookManager();
    const order: number[] = [];

    hooks.register('test', 'before', async () => {
      order.push(1);
    });
    hooks.register('test', 'before', async () => {
      order.push(2);
    });

    await hooks.execute('test', 'before', {});
    expect(order).toEqual([1, 2]);
  });

  it('unregisters hooks', async () => {
    const hooks = new HookManager();
    const order: string[] = [];

    const unregister = hooks.register('test', 'before', async () => {
      order.push('hook');
    });

    await hooks.execute('test', 'before', {});
    expect(order).toEqual(['hook']);

    order.length = 0;
    unregister();
    await hooks.execute('test', 'before', {});
    expect(order).toEqual([]);
  });

  it('executes hooks sequentially by default', async () => {
    const hooks = new HookManager();
    const order: number[] = [];

    hooks.register('test', 'before', async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
      order.push(1);
    });
    hooks.register('test', 'before', async () => {
      order.push(2);
    });

    await hooks.execute('test', 'before', {});
    expect(order).toEqual([1, 2]);
  });

  it('executes hooks in parallel when configured', async () => {
    const hooks = new HookManager({ parallel: true });
    const order: number[] = [];

    hooks.register('test', 'before', async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
      order.push(1);
    });
    hooks.register('test', 'before', async () => {
      order.push(2);
    });

    await hooks.execute('test', 'before', {});
    expect(order).toEqual([2, 1]);
  });

  it('executes hooks in parallel with bail option', async () => {
    const hooks = new HookManager({ parallel: true, bail: true });
    const order: number[] = [];

    hooks.register('test', 'before', async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
      order.push(1);
    });
    hooks.register('test', 'before', async () => {
      order.push(2);
    });

    await hooks.execute('test', 'before', {});
    expect(order).toEqual([2, 1]);
  });

  it('handles errors with bail option', async () => {
    const hooks = new HookManager({ bail: true });

    hooks.register('test', 'before', async () => {
      throw new Error('First error');
    });
    hooks.register('test', 'before', async () => {
      throw new Error('Second error');
    });

    await expect(hooks.execute('test', 'before', {})).rejects.toThrow('First error');
  });

  it('collects errors without bail option', async () => {
    const hooks = new HookManager({ bail: false, parallel: true });

    hooks.register('test', 'before', async () => {
      throw new Error('First error');
    });
    hooks.register('test', 'before', async () => {
      throw new Error('Second error');
    });

    await expect(hooks.execute('test', 'before', {})).rejects.toThrow(AggregateError);
  });

  it('continues on error in sequential mode without bail', async () => {
    const hooks = new HookManager({ bail: false });
    const order: number[] = [];
    const origError = console.error;
    console.error = () => {};

    hooks.register('test', 'before', async () => {
      order.push(1);
      throw new Error('Error');
    });
    hooks.register('test', 'before', async () => {
      order.push(2);
    });

    try {
      await hooks.execute('test', 'before', {});
      expect(order).toEqual([1, 2]);
    } finally {
      console.error = origError;
    }
  });

  it('handles different stages independently', async () => {
    const hooks = new HookManager();
    const order: string[] = [];

    hooks.register('stage1', 'before', async () => {
      order.push('stage1:before');
    });
    hooks.register('stage1', 'after', async () => {
      order.push('stage1:after');
    });
    hooks.register('stage2', 'before', async () => {
      order.push('stage2:before');
    });

    await hooks.execute('stage1', 'before', {});
    await hooks.execute('stage1', 'after', {});
    await hooks.execute('stage2', 'before', {});

    expect(order).toEqual(['stage1:before', 'stage1:after', 'stage2:before']);
  });

  it('handles typed payload', async () => {
    interface TestPayload {
      value: number;
      name: string;
    }

    const hooks = new HookManager<{ test: TestPayload }>();
    let received: TestPayload | null = null;

    hooks.register('test', 'before', async (payload) => {
      received = payload;
    });

    await hooks.execute('test', 'before', { value: 42, name: 'test' });
    expect(received).toEqual({ value: 42, name: 'test' });
  });

  it('does nothing when no hooks registered', async () => {
    const hooks = new HookManager();
    await expect(hooks.execute('test', 'before', {})).resolves.toBeUndefined();
  });

  describe('has', () => {
    it('returns true when hooks exist', () => {
      const hooks = new HookManager();
      hooks.register('test', 'before', async () => {});
      expect(hooks.has('test', 'before')).toBe(true);
    });

    it('returns false when no hooks exist', () => {
      const hooks = new HookManager();
      expect(hooks.has('test', 'before')).toBe(false);
    });

    it('returns false for different phase', () => {
      const hooks = new HookManager();
      hooks.register('test', 'before', async () => {});
      expect(hooks.has('test', 'after')).toBe(false);
    });
  });

  describe('count', () => {
    it('returns correct count for single hook', () => {
      const hooks = new HookManager();
      hooks.register('test', 'before', async () => {});
      expect(hooks.count('test', 'before')).toBe(1);
    });

    it('returns correct count for multiple hooks', () => {
      const hooks = new HookManager();
      hooks.register('test', 'before', async () => {});
      hooks.register('test', 'before', async () => {});
      hooks.register('test', 'before', async () => {});
      expect(hooks.count('test', 'before')).toBe(3);
    });

    it('returns 0 when no hooks', () => {
      const hooks = new HookManager();
      expect(hooks.count('test', 'before')).toBe(0);
    });
  });

  describe('clear', () => {
    it('clears all hooks for specific stage and phase', () => {
      const hooks = new HookManager();
      hooks.register('test', 'before', async () => {});
      hooks.clear('test', 'before');
      expect(hooks.has('test', 'before')).toBe(false);
    });

    it('clears all hooks for specific stage (both phases)', () => {
      const hooks = new HookManager();
      hooks.register('test', 'before', async () => {});
      hooks.register('test', 'after', async () => {});
      hooks.clear('test');
      expect(hooks.has('test', 'before')).toBe(false);
      expect(hooks.has('test', 'after')).toBe(false);
    });

    it('clears all hooks when no stage specified', () => {
      const hooks = new HookManager();
      hooks.register('stage1', 'before', async () => {});
      hooks.register('stage2', 'after', async () => {});
      hooks.clear();
      expect(hooks.has('stage1', 'before')).toBe(false);
      expect(hooks.has('stage2', 'after')).toBe(false);
    });

    it('only clears specified stage', () => {
      const hooks = new HookManager();
      hooks.register('stage1', 'before', async () => {});
      hooks.register('stage2', 'before', async () => {});
      hooks.clear('stage1');
      expect(hooks.has('stage1', 'before')).toBe(false);
      expect(hooks.has('stage2', 'before')).toBe(true);
    });
  });
});

describe('StageHookManager', () => {
  it('registers before hook', async () => {
    const hooks = new HookManager();
    const stageHooks = hooks.for('test');
    const order: string[] = [];

    stageHooks.before(async () => {
      order.push('before');
    });

    await stageHooks.runBefore({});
    expect(order).toEqual(['before']);
  });

  it('registers after hook', async () => {
    const hooks = new HookManager();
    const stageHooks = hooks.for('test');
    const order: string[] = [];

    stageHooks.after(async () => {
      order.push('after');
    });

    await stageHooks.runAfter({});
    expect(order).toEqual(['after']);
  });

  it('returns unregister function for before', async () => {
    const hooks = new HookManager();
    const stageHooks = hooks.for('test');
    const order: string[] = [];

    const unregister = stageHooks.before(async () => {
      order.push('before');
    });

    await stageHooks.runBefore({});
    expect(order).toEqual(['before']);

    order.length = 0;
    unregister();
    await stageHooks.runBefore({});
    expect(order).toEqual([]);
  });

  it('returns unregister function for after', async () => {
    const hooks = new HookManager();
    const stageHooks = hooks.for('test');
    const order: string[] = [];

    const unregister = stageHooks.after(async () => {
      order.push('after');
    });

    await stageHooks.runAfter({});
    expect(order).toEqual(['after']);

    order.length = 0;
    unregister();
    await stageHooks.runAfter({});
    expect(order).toEqual([]);
  });

  it('handles typed payload', async () => {
    interface TestPayload {
      value: number;
    }

    const hooks = new HookManager<{ test: TestPayload }>();
    const stageHooks = hooks.for('test');
    let received: TestPayload | null = null;

    stageHooks.before(async (payload) => {
      received = payload;
    });

    await stageHooks.runBefore({ value: 42 });
    expect(received).toEqual({ value: 42 });
  });
});
