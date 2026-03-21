/**
 * Pipeline utilities for composing functions
 */

import type { Pipeline, Middleware } from '../interfaces/index.js';

/**
 * Compose functions left to right
 */
export function pipe<T>(...fns: Array<(x: T) => T>): (x: T) => T {
  return (x: T) => fns.reduce((v, f) => f(v), x);
}

/**
 * Compose async functions left to right
 */
export function pipeAsync<T>(...fns: Array<(x: T) => T | Promise<T>>): (x: T) => Promise<T> {
  return async (x: T) => {
    let result = x;
    for (const fn of fns) {
      result = await fn(result);
    }
    return result;
  };
}

/**
 * Compose functions right to left
 */
export function compose<T>(...fns: Array<(x: T) => T>): (x: T) => T {
  return (x: T) => fns.reduceRight((v, f) => f(v), x);
}

/**
 * Create a pipeline from steps
 */
export function createPipeline<TInput, TOutput>(
  ...steps: Array<(input: TInput | TOutput) => TOutput | Promise<TOutput>>
): Pipeline<TInput, TOutput> {
  return async (input: TInput) => {
    let result: TInput | TOutput = input;
    for (const step of steps) {
      result = await step(result);
    }
    return result as TOutput;
  };
}

/**
 * Apply middleware chain
 */
export function applyMiddleware<T>(value: T, middlewares: Middleware<T>[]): T | Promise<T> {
  let index = 0;
  
  function next(): T | Promise<T> {
    if (index >= middlewares.length) {
      return value;
    }
    
    const middleware = middlewares[index++];
    return middleware(value, next);
  }
  
  return next();
}

/**
 * Curry a function
 */
export function curry<T1, T2, T3>(
  fn: (a: T1, b: T2) => T3
): (a: T1) => (b: T2) => T3 {
  return (a: T1) => (b: T2) => fn(a, b);
}

/**
 * Partial application
 */
export function partial<T1, T2 extends unknown[], TReturn>(
  fn: (a: T1, ...rest: T2) => TReturn,
  a: T1
): (...rest: T2) => TReturn {
  return (...rest: T2) => fn(a, ...rest);
}

/**
 * Tap - execute side effect and return original value
 */
export function tap<T>(fn: (x: T) => void): (x: T) => T {
  return (x: T) => {
    fn(x);
    return x;
  };
}

/**
 * Try catch wrapper
 */
export function tryCatch<T, E = Error>(
  fn: () => T,
  onError?: (error: E) => T
): T | undefined {
  try {
    return fn();
  } catch (error) {
    return onError?.(error as E);
  }
}

/**
 * Async try catch wrapper
 */
export async function tryCatchAsync<T, E = Error>(
  fn: () => Promise<T>,
  onError?: (error: E) => T | Promise<T>
): Promise<T | undefined> {
  try {
    return await fn();
  } catch (error) {
    return onError?.(error as E);
  }
}
