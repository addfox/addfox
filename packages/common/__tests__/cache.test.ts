import { describe, it, expect } from '@rstest/core';
import { createCache, memoize, memoizeAsync } from '../src/utils/cache.js';

describe('createCache', () => {
  it('creates a cache with all required methods', () => {
    const cache = createCache<string>();
    expect(cache.get).toBeTypeOf('function');
    expect(cache.set).toBeTypeOf('function');
    expect(cache.has).toBeTypeOf('function');
    expect(cache.delete).toBeTypeOf('function');
    expect(cache.clear).toBeTypeOf('function');
    expect(cache.keys).toBeTypeOf('function');
    expect(cache.size).toBeTypeOf('function');
  });

  it('stores and retrieves values', () => {
    const cache = createCache<string>();
    cache.set('key1', 'value1');
    expect(cache.get('key1')).toBe('value1');
  });

  it('returns undefined for non-existent keys', () => {
    const cache = createCache<string>();
    expect(cache.get('non-existent')).toBeUndefined();
  });

  it('checks if key exists', () => {
    const cache = createCache<string>();
    cache.set('key1', 'value1');
    expect(cache.has('key1')).toBe(true);
    expect(cache.has('key2')).toBe(false);
  });

  it('deletes keys', () => {
    const cache = createCache<string>();
    cache.set('key1', 'value1');
    expect(cache.delete('key1')).toBe(true);
    expect(cache.has('key1')).toBe(false);
    expect(cache.delete('key1')).toBe(false);
  });

  it('clears all entries', () => {
    const cache = createCache<string>();
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    cache.clear();
    expect(cache.has('key1')).toBe(false);
    expect(cache.has('key2')).toBe(false);
    expect(cache.size()).toBe(0);
  });

  it('returns all keys', () => {
    const cache = createCache<string>();
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    const keys = cache.keys();
    expect(keys).toContain('key1');
    expect(keys).toContain('key2');
    expect(keys).toHaveLength(2);
  });

  it('returns correct size', () => {
    const cache = createCache<string>();
    expect(cache.size()).toBe(0);
    cache.set('key1', 'value1');
    expect(cache.size()).toBe(1);
    cache.set('key2', 'value2');
    expect(cache.size()).toBe(2);
  });

  it('respects TTL and expires entries', async () => {
    const cache = createCache<string>();
    cache.set('key1', 'value1', 10); // 10ms TTL
    expect(cache.get('key1')).toBe('value1');
    
    await new Promise(resolve => setTimeout(resolve, 20));
    expect(cache.get('key1')).toBeUndefined();
    expect(cache.has('key1')).toBe(false);
  });

  it('has() returns false and deletes expired entry', async () => {
    const cache = createCache<string>();
    cache.set('key1', 'value1', 10); // 10ms TTL
    
    await new Promise(resolve => setTimeout(resolve, 20));
    // Entry should be expired and deleted when calling has()
    expect(cache.has('key1')).toBe(false);
    // Verify it's been deleted
    expect(cache.get('key1')).toBeUndefined();
  });

  it('handles entries without TTL', async () => {
    const cache = createCache<string>();
    cache.set('key1', 'value1'); // No TTL
    
    await new Promise(resolve => setTimeout(resolve, 10));
    expect(cache.get('key1')).toBe('value1');
    expect(cache.has('key1')).toBe(true);
  });

  it('stores different types', () => {
    const stringCache = createCache<string>();
    stringCache.set('key', 'value');
    expect(stringCache.get('key')).toBe('value');

    const numberCache = createCache<number>();
    numberCache.set('key', 42);
    expect(numberCache.get('key')).toBe(42);

    const objectCache = createCache<{ a: number }>();
    objectCache.set('key', { a: 1 });
    expect(objectCache.get('key')).toEqual({ a: 1 });
  });
});

describe('memoize', () => {
  it('caches function results', () => {
    let callCount = 0;
    const fn = (x: number) => {
      callCount++;
      return x * 2;
    };
    const memoized = memoize(fn);

    expect(memoized(5)).toBe(10);
    expect(memoized(5)).toBe(10);
    expect(callCount).toBe(1);
  });

  it('calls function for different arguments', () => {
    let callCount = 0;
    const fn = (x: number) => {
      callCount++;
      return x * 2;
    };
    const memoized = memoize(fn);

    expect(memoized(5)).toBe(10);
    expect(memoized(10)).toBe(20);
    expect(callCount).toBe(2);
  });

  it('uses custom key function', () => {
    let callCount = 0;
    const fn = (a: number, b: number) => {
      callCount++;
      return a + b;
    };
    const memoized = memoize(fn, (a, b) => `${a}-${b}`);

    expect(memoized(1, 2)).toBe(3);
    expect(memoized(1, 2)).toBe(3);
    expect(callCount).toBe(1);
  });

  it('handles multiple arguments', () => {
    const fn = (a: number, b: number, c: number) => a + b + c;
    const memoized = memoize(fn);

    expect(memoized(1, 2, 3)).toBe(6);
    expect(memoized(1, 2, 3)).toBe(6);
  });

  it('handles objects as arguments', () => {
    const fn = (obj: { a: number }) => obj.a * 2;
    const memoized = memoize(fn);

    expect(memoized({ a: 5 })).toBe(10);
    expect(memoized({ a: 5 })).toBe(10);
  });
});

describe('memoizeAsync', () => {
  it('caches async function results', async () => {
    let callCount = 0;
    const fn = async (x: number) => {
      callCount++;
      return x * 2;
    };
    const memoized = memoizeAsync(fn);

    expect(await memoized(5)).toBe(10);
    expect(await memoized(5)).toBe(10);
    expect(callCount).toBe(1);
  });

  it('returns pending promise for concurrent calls', async () => {
    let callCount = 0;
    const fn = async (x: number) => {
      await new Promise(resolve => setTimeout(resolve, 10));
      callCount++;
      return x * 2;
    };
    const memoized = memoizeAsync(fn);

    const promise1 = memoized(5);
    const promise2 = memoized(5);
    const promise3 = memoized(5);

    const [result1, result2, result3] = await Promise.all([promise1, promise2, promise3]);
    expect(result1).toBe(10);
    expect(result2).toBe(10);
    expect(result3).toBe(10);
    expect(callCount).toBe(1);
  });

  it('calls function for different arguments', async () => {
    let callCount = 0;
    const fn = async (x: number) => {
      callCount++;
      return x * 2;
    };
    const memoized = memoizeAsync(fn);

    expect(await memoized(5)).toBe(10);
    expect(await memoized(10)).toBe(20);
    expect(callCount).toBe(2);
  });

  it('uses custom key function', async () => {
    let callCount = 0;
    const fn = async (a: number, b: number) => {
      callCount++;
      return a + b;
    };
    const memoized = memoizeAsync(fn, (a, b) => `${a}-${b}`);

    expect(await memoized(1, 2)).toBe(3);
    expect(await memoized(1, 2)).toBe(3);
    expect(callCount).toBe(1);
  });

  it('caches result after promise resolves', async () => {
    let callCount = 0;
    const fn = async (x: number) => {
      callCount++;
      await new Promise(resolve => setTimeout(resolve, 5));
      return x * 2;
    };
    const memoized = memoizeAsync(fn);

    await memoized(5);
    const result = await memoized(5);
    expect(result).toBe(10);
    expect(callCount).toBe(1);
  });
});
