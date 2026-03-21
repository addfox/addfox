import { describe, it, expect } from '@rstest/core';
import {
  pipe,
  pipeAsync,
  compose,
  createPipeline,
  applyMiddleware,
  curry,
  partial,
  tap,
  tryCatch,
  tryCatchAsync,
} from '../src/utils/pipeline.js';

describe('pipe', () => {
  it('composes functions left to right', () => {
    const add1 = (x: number) => x + 1;
    const multiply2 = (x: number) => x * 2;
    const composed = pipe(add1, multiply2);
    expect(composed(5)).toBe(12); // (5 + 1) * 2 = 12
  });

  it('works with single function', () => {
    const add1 = (x: number) => x + 1;
    const composed = pipe(add1);
    expect(composed(5)).toBe(6);
  });

  it('works with no functions', () => {
    const composed = pipe<number>();
    expect(composed(5)).toBe(5);
  });

  it('works with string transformations', () => {
    const upper = (s: string) => s.toUpperCase();
    const exclaim = (s: string) => s + '!';
    const composed = pipe(upper, exclaim);
    expect(composed('hello')).toBe('HELLO!');
  });
});

describe('pipeAsync', () => {
  it('composes async functions', async () => {
    const add1 = async (x: number) => x + 1;
    const multiply2 = async (x: number) => x * 2;
    const composed = pipeAsync(add1, multiply2);
    expect(await composed(5)).toBe(12);
  });

  it('handles mixed sync and async functions', async () => {
    const add1 = (x: number) => x + 1;
    const multiply2 = async (x: number) => x * 2;
    const composed = pipeAsync(add1, multiply2);
    expect(await composed(5)).toBe(12);
  });

  it('works with single function', async () => {
    const add1 = async (x: number) => x + 1;
    const composed = pipeAsync(add1);
    expect(await composed(5)).toBe(6);
  });

  it('works with no functions', async () => {
    const composed = pipeAsync<number>();
    expect(await composed(5)).toBe(5);
  });
});

describe('compose', () => {
  it('composes functions right to left', () => {
    const add1 = (x: number) => x + 1;
    const multiply2 = (x: number) => x * 2;
    const composed = compose(add1, multiply2);
    expect(composed(5)).toBe(11); // (5 * 2) + 1 = 11
  });

  it('works with single function', () => {
    const add1 = (x: number) => x + 1;
    const composed = compose(add1);
    expect(composed(5)).toBe(6);
  });

  it('works with no functions', () => {
    const composed = compose<number>();
    expect(composed(5)).toBe(5);
  });
});

describe('createPipeline', () => {
  it('creates pipeline from steps', async () => {
    const pipeline = createPipeline<number, number>(
      (x) => x + 1,
      (x) => x * 2,
      (x) => x.toString()
    );
    expect(await pipeline(5)).toBe('12');
  });

  it('handles async steps', async () => {
    const pipeline = createPipeline<number, number>(
      async (x) => x + 1,
      async (x) => x * 2
    );
    expect(await pipeline(5)).toBe(12);
  });

  it('passes value through pipeline', async () => {
    const steps: number[] = [];
    const pipeline = createPipeline<number, number>(
      (x) => { steps.push(x); return x + 1; },
      (x) => { steps.push(x); return x * 2; },
      (x) => { steps.push(x); return x - 3; }
    );
    const result = await pipeline(5);
    expect(result).toBe(9); // ((5 + 1) * 2) - 3 = 9
    expect(steps).toEqual([5, 6, 12]);
  });

  it('works with single step', async () => {
    const pipeline = createPipeline<number, number>((x) => x * 2);
    expect(await pipeline(5)).toBe(10);
  });

  it('works with no steps', async () => {
    const pipeline = createPipeline<number, number>();
    expect(await pipeline(5)).toBe(5);
  });
});

describe('applyMiddleware', () => {
  it('applies middleware chain in order', async () => {
    const calls: string[] = [];
    const middleware = [
      (x: number, next: () => number | Promise<number>) => {
        calls.push('first-before');
        const result = next();
        calls.push('first-after');
        return result;
      },
      (x: number, next: () => number | Promise<number>) => {
        calls.push('second-before');
        const result = next();
        calls.push('second-after');
        return result;
      },
    ];

    const result = await applyMiddleware(5, middleware);
    // The middleware chain returns the value when no middleware modifies it
    expect(result).toBe(5);
    expect(calls).toEqual(['first-before', 'second-before', 'second-after', 'first-after']);
  });

  it('allows middleware to modify value', async () => {
    const middleware = [
      (x: number, next: () => number | Promise<number>) => {
        return next() as number * 2;
      },
      (x: number, next: () => number | Promise<number>) => {
        return (next() as number) + 10;
      },
    ];

    const result = await applyMiddleware(5, middleware);
    // (5 + 10) * 2 = 30
    expect(result).toBe(30);
  });

  it('works with no middleware', async () => {
    const result = await applyMiddleware(42, []);
    expect(result).toBe(42);
  });

  it('works with single middleware', async () => {
    const result = await applyMiddleware(5, [
      (x: number, next: () => number | Promise<number>) => next() as number * 2
    ]);
    expect(result).toBe(10);
  });

  it('handles async middleware', async () => {
    const result = await applyMiddleware(5, [
      async (x: number, next: () => number | Promise<number>) => {
        await Promise.resolve();
        return (await next()) * 3;
      }
    ]);
    expect(result).toBe(15);
  });
});

describe('curry', () => {
  it('curries a two-argument function', () => {
    const add = (a: number, b: number) => a + b;
    const curriedAdd = curry(add);
    
    expect(curriedAdd(1)(2)).toBe(3);
  });

  it('allows partial application', () => {
    const multiply = (a: number, b: number) => a * b;
    const curriedMultiply = curry(multiply);
    const double = curriedMultiply(2);
    
    expect(double(5)).toBe(10);
    expect(double(3)).toBe(6);
  });
});

describe('partial', () => {
  it('applies first argument', () => {
    const greet = (greeting: string, name: string) => `${greeting}, ${name}!`;
    const sayHello = partial(greet, 'Hello');
    
    expect(sayHello('World')).toBe('Hello, World!');
  });

  it('works with multiple remaining arguments', () => {
    const sum3 = (a: number, b: number, c: number) => a + b + c;
    const add5 = partial(sum3, 5);
    
    expect(add5(10, 20)).toBe(35);
  });
});

describe('tap', () => {
  it('executes side effect and returns original value', () => {
    let sideEffect: number | null = null;
    const logValue = tap((x: number) => { sideEffect = x; });
    
    const result = logValue(42);
    expect(result).toBe(42);
    expect(sideEffect).toBe(42);
  });

  it('works in pipeline', () => {
    const calls: number[] = [];
    const pipeline = pipe(
      (x: number) => x + 1,
      tap((x) => calls.push(x)),
      (x: number) => x * 2
    );
    
    expect(pipeline(5)).toBe(12);
    expect(calls).toEqual([6]);
  });
});

describe('tryCatch', () => {
  it('returns result when no error', () => {
    const result = tryCatch(() => 42);
    expect(result).toBe(42);
  });

  it('returns undefined on error without handler', () => {
    const result = tryCatch(() => { throw new Error('fail'); });
    expect(result).toBeUndefined();
  });

  it('calls error handler on error', () => {
    const result = tryCatch(
      () => { throw new Error('fail'); },
      () => 'default'
    );
    expect(result).toBe('default');
  });

  it('passes error to handler', () => {
    let capturedError: Error | null = null;
    tryCatch(
      () => { throw new Error('specific error'); },
      (error) => {
        capturedError = error;
        return 'handled';
      }
    );
    expect(capturedError?.message).toBe('specific error');
  });
});

describe('tryCatchAsync', () => {
  it('returns result when no error', async () => {
    const result = await tryCatchAsync(async () => 42);
    expect(result).toBe(42);
  });

  it('returns undefined on error without handler', async () => {
    const result = await tryCatchAsync(async () => { throw new Error('fail'); });
    expect(result).toBeUndefined();
  });

  it('calls error handler on error', async () => {
    const result = await tryCatchAsync(
      async () => { throw new Error('fail'); },
      () => 'default'
    );
    expect(result).toBe('default');
  });

  it('handles async error handler', async () => {
    const result = await tryCatchAsync(
      async () => { throw new Error('fail'); },
      async () => 'async handled'
    );
    expect(result).toBe('async handled');
  });

  it('passes error to handler', async () => {
    let capturedError: Error | null = null;
    await tryCatchAsync(
      async () => { throw new Error('async error'); },
      (error) => {
        capturedError = error;
        return 'handled';
      }
    );
    expect(capturedError?.message).toBe('async error');
  });
});
