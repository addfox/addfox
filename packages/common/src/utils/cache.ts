/**
 * Cache utilities
 */

import type { CacheEntry } from '../interfaces/index.js';

/**
 * Simple memory cache
 */
export interface Cache<T> {
  get(key: string): T | undefined;
  set(key: string, value: T, ttlMs?: number): void;
  has(key: string): boolean;
  delete(key: string): boolean;
  clear(): void;
  keys(): string[];
  size(): number;
}

/**
 * Create a memory cache
 */
export function createCache<T>(): Cache<T> {
  const store = new Map<string, CacheEntry<T>>();

  return {
    get(key: string): T | undefined {
      const entry = store.get(key);
      if (!entry) return undefined;
      
      if (entry.expiresAt && Date.now() > entry.expiresAt) {
        store.delete(key);
        return undefined;
      }
      
      return entry.value;
    },

    set(key: string, value: T, ttlMs?: number): void {
      const entry: CacheEntry<T> = {
        value,
        expiresAt: ttlMs ? Date.now() + ttlMs : undefined,
      };
      store.set(key, entry);
    },

    has(key: string): boolean {
      const entry = store.get(key);
      if (!entry) return false;
      
      if (entry.expiresAt && Date.now() > entry.expiresAt) {
        store.delete(key);
        return false;
      }
      
      return true;
    },

    delete(key: string): boolean {
      return store.delete(key);
    },

    clear(): void {
      store.clear();
    },

    keys(): string[] {
      const now = Date.now();
      const keys: string[] = [];
      
      for (const [key, entry] of store) {
        if (!entry.expiresAt || now <= entry.expiresAt) {
          keys.push(key);
        }
      }
      
      return keys;
    },

    size(): number {
      return this.keys().length;
    },
  };
}

/**
 * Memoize a function
 */
export function memoize<TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => TReturn,
  keyFn?: (...args: TArgs) => string
): (...args: TArgs) => TReturn {
  const cache = createCache<TReturn>();
  
  return (...args: TArgs): TReturn => {
    const key = keyFn ? keyFn(...args) : JSON.stringify(args);
    
    if (cache.has(key)) {
      return cache.get(key)!;
    }
    
    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
}

/**
 * Memoize an async function
 */
export function memoizeAsync<TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>,
  keyFn?: (...args: TArgs) => string
): (...args: TArgs) => Promise<TReturn> {
  const cache = createCache<TReturn>();
  const pending = new Map<string, Promise<TReturn>>();
  
  return async (...args: TArgs): Promise<TReturn> => {
    const key = keyFn ? keyFn(...args) : JSON.stringify(args);
    
    // Return cached value
    if (cache.has(key)) {
      return cache.get(key)!;
    }
    
    // Return pending promise
    if (pending.has(key)) {
      return pending.get(key)!;
    }
    
    // Execute and cache
    const promise = fn(...args).finally(() => {
      pending.delete(key);
    });
    
    pending.set(key, promise);
    
    const result = await promise;
    cache.set(key, result);
    return result;
  };
}
