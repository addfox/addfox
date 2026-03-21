import { describe, it, expect } from '@rstest/core';
import {
  deepMerge,
  pick,
  omit,
  get,
  set,
  has,
  flatten,
  unflatten,
  filter,
  mapValues,
  isPlainObject,
  isEmpty,
} from '../src/utils/object.js';

describe('deepMerge', () => {
  it('merges simple objects', () => {
    const target = { a: 1, b: 2 };
    const source = { b: 3, c: 4 };
    expect(deepMerge(target, source)).toEqual({ a: 1, b: 3, c: 4 });
  });

  it('merges nested objects', () => {
    const target = { a: 1, nested: { x: 1, y: 2 } };
    const source = { nested: { y: 3, z: 4 } };
    expect(deepMerge(target, source)).toEqual({
      a: 1,
      nested: { x: 1, y: 3, z: 4 },
    });
  });

  it('replaces arrays instead of merging', () => {
    const target = { arr: [1, 2] };
    const source = { arr: [3, 4] };
    expect(deepMerge(target, source)).toEqual({ arr: [3, 4] });
  });

  it('handles null values', () => {
    const target = { a: 1 };
    const source = { b: null };
    expect(deepMerge(target, source)).toEqual({ a: 1, b: null });
  });

  it('does not modify original target', () => {
    const target = { a: 1, nested: { x: 1 } };
    const source = { nested: { y: 2 } };
    const result = deepMerge(target, source);
    expect(target).toEqual({ a: 1, nested: { x: 1 } });
    expect(result).toEqual({ a: 1, nested: { x: 1, y: 2 } });
  });

  it('handles empty objects', () => {
    expect(deepMerge({}, {})).toEqual({});
    expect(deepMerge({ a: 1 }, {})).toEqual({ a: 1 });
    expect(deepMerge({}, { a: 1 })).toEqual({ a: 1 });
  });
});

describe('pick', () => {
  it('picks specified keys', () => {
    const obj = { a: 1, b: 2, c: 3, d: 4 };
    expect(pick(obj, ['a', 'c'])).toEqual({ a: 1, c: 3 });
  });

  it('returns empty object for no keys', () => {
    const obj = { a: 1, b: 2 };
    expect(pick(obj, [])).toEqual({});
  });

  it('ignores non-existent keys', () => {
    const obj = { a: 1 };
    expect(pick(obj, ['a', 'b' as keyof typeof obj])).toEqual({ a: 1 });
  });

  it('works with nested objects', () => {
    const obj = { a: { x: 1 }, b: 2 };
    expect(pick(obj, ['a'])).toEqual({ a: { x: 1 } });
  });
});

describe('omit', () => {
  it('omits specified keys', () => {
    const obj = { a: 1, b: 2, c: 3, d: 4 };
    expect(omit(obj, ['b', 'd'])).toEqual({ a: 1, c: 3 });
  });

  it('returns same object for no keys', () => {
    const obj = { a: 1, b: 2 };
    expect(omit(obj, [])).toEqual({ a: 1, b: 2 });
  });

  it('ignores non-existent keys', () => {
    const obj = { a: 1, b: 2 };
    expect(omit(obj, ['a', 'c' as keyof typeof obj])).toEqual({ b: 2 });
  });

  it('returns empty object when omitting all keys', () => {
    const obj = { a: 1, b: 2 };
    expect(omit(obj, ['a', 'b'])).toEqual({});
  });
});

describe('isPlainObject', () => {
  it('returns true for plain objects', () => {
    expect(isPlainObject({})).toBe(true);
    expect(isPlainObject({ a: 1 })).toBe(true);
    expect(isPlainObject(Object.create(null))).toBe(true);
  });

  it('returns false for arrays', () => {
    expect(isPlainObject([])).toBe(false);
    expect(isPlainObject([1, 2, 3])).toBe(false);
  });

  it('returns false for null', () => {
    expect(isPlainObject(null)).toBe(false);
  });

  it('returns false for primitives', () => {
    expect(isPlainObject(1)).toBe(false);
    expect(isPlainObject('string')).toBe(false);
    expect(isPlainObject(true)).toBe(false);
  });

  it('returns false for functions', () => {
    expect(isPlainObject(() => {})).toBe(false);
    expect(isPlainObject(function() {})).toBe(false);
  });

  it('returns false for class instances', () => {
    class TestClass {}
    expect(isPlainObject(new TestClass())).toBe(false);
  });
});

describe('get', () => {
  it('gets nested property value', () => {
    const obj = { a: { b: { c: 1 } } };
    expect(get(obj, 'a.b.c')).toBe(1);
  });

  it('gets direct property', () => {
    const obj = { a: 1, b: 2 };
    expect(get(obj, 'a')).toBe(1);
  });

  it('returns default value for non-existent path', () => {
    const obj = { a: { b: 1 } };
    expect(get(obj, 'a.b.c', 'default')).toBe('default');
  });

  it('returns undefined for non-existent path without default', () => {
    const obj = { a: 1 };
    expect(get(obj, 'a.b.c')).toBeUndefined();
  });

  it('handles null in path', () => {
    const obj = { a: null };
    expect(get(obj, 'a.b', 'default')).toBe('default');
  });

  it('handles undefined in path', () => {
    const obj = { a: undefined };
    expect(get(obj, 'a.b', 'default')).toBe('default');
  });
});

describe('set', () => {
  it('sets nested property value', () => {
    const obj = { a: { b: 1 } };
    const result = set(obj, 'a.c.d', 2);
    expect(result.a.c.d).toBe(2);
  });

  it('creates nested objects when path does not exist', () => {
    const obj = {};
    const result = set(obj, 'a.b.c', 'value');
    expect(result).toEqual({ a: { b: { c: 'value' } } });
  });

  it('does not modify original object', () => {
    const obj = { a: 1 };
    const result = set(obj, 'b', 2);
    expect(obj).toEqual({ a: 1 });
    expect(result).toEqual({ a: 1, b: 2 });
  });

  it('overwrites existing values', () => {
    const obj = { a: { b: 1 } };
    const result = set(obj, 'a.b', 2);
    expect(result.a.b).toBe(2);
  });

  it('handles single key path', () => {
    const obj = {};
    const result = set(obj, 'key', 'value');
    expect(result).toEqual({ key: 'value' });
  });
});

describe('has', () => {
  it('returns true for existing nested property', () => {
    const obj = { a: { b: { c: 1 } } };
    expect(has(obj, 'a.b.c')).toBe(true);
  });

  it('returns false for non-existent property', () => {
    const obj = { a: 1 };
    expect(has(obj, 'b')).toBe(false);
  });

  it('returns false for non-existent nested property', () => {
    const obj = { a: { b: 1 } };
    expect(has(obj, 'a.b.c')).toBe(false);
  });

  it('returns false when encountering null', () => {
    const obj = { a: null };
    expect(has(obj, 'a.b')).toBe(false);
  });

  it('returns false when encountering undefined', () => {
    const obj = { a: undefined };
    expect(has(obj, 'a.b')).toBe(false);
  });

  it('returns true for direct property', () => {
    const obj = { key: 'value' };
    expect(has(obj, 'key')).toBe(true);
  });
});

describe('flatten', () => {
  it('flattens nested object', () => {
    const obj = { a: { b: 1, c: 2 } };
    expect(flatten(obj)).toEqual({ 'a.b': 1, 'a.c': 2 });
  });

  it('flattens deeply nested object', () => {
    const obj = { a: { b: { c: { d: 1 } } } };
    expect(flatten(obj)).toEqual({ 'a.b.c.d': 1 });
  });

  it('preserves non-object values', () => {
    const obj = { a: 1, b: 'string', c: true, d: null };
    expect(flatten(obj)).toEqual({ a: 1, b: 'string', c: true, d: null });
  });

  it('handles arrays as values (not flattening them)', () => {
    const obj = { a: { b: [1, 2, 3] } };
    expect(flatten(obj)).toEqual({ 'a.b': [1, 2, 3] });
  });

  it('handles custom prefix', () => {
    const obj = { a: 1, b: 2 };
    expect(flatten(obj, 'prefix')).toEqual({ 'prefix.a': 1, 'prefix.b': 2 });
  });

  it('handles empty object', () => {
    expect(flatten({})).toEqual({});
  });
});

describe('unflatten', () => {
  it('unflattens object', () => {
    const obj = { 'a.b': 1, 'a.c': 2 };
    expect(unflatten(obj)).toEqual({ a: { b: 1, c: 2 } });
  });

  it('unflattens deeply nested object', () => {
    const obj = { 'a.b.c.d': 1 };
    expect(unflatten(obj)).toEqual({ a: { b: { c: { d: 1 } } } });
  });

  it('handles non-nested keys', () => {
    const obj = { a: 1, b: 2 };
    expect(unflatten(obj)).toEqual({ a: 1, b: 2 });
  });

  it('handles empty object', () => {
    expect(unflatten({})).toEqual({});
  });

  it('merges overlapping paths', () => {
    const obj = { 'a.b': 1, 'a.c': 2 };
    expect(unflatten(obj)).toEqual({ a: { b: 1, c: 2 } });
  });
});

describe('filter', () => {
  it('filters by predicate', () => {
    const obj = { a: 1, b: 2, c: 3, d: 4 };
    const result = filter(obj, (key, value) => (value as number) > 2);
    expect(result).toEqual({ c: 3, d: 4 });
  });

  it('filters by key', () => {
    const obj = { a: 1, b: 2, c: 3 };
    const result = filter(obj, (key) => key === 'a' || key === 'c');
    expect(result).toEqual({ a: 1, c: 3 });
  });

  it('returns empty object when no matches', () => {
    const obj = { a: 1, b: 2 };
    const result = filter(obj, () => false);
    expect(result).toEqual({});
  });

  it('returns full object when all match', () => {
    const obj = { a: 1, b: 2 };
    const result = filter(obj, () => true);
    expect(result).toEqual({ a: 1, b: 2 });
  });
});

describe('mapValues', () => {
  it('maps values with function', () => {
    const obj = { a: 1, b: 2, c: 3 };
    const result = mapValues(obj, (value) => (value as number) * 2);
    expect(result).toEqual({ a: 2, b: 4, c: 6 });
  });

  it('maps with key access', () => {
    const obj = { a: 1, b: 2 };
    const result = mapValues(obj, (value, key) => `${key}-${value}`);
    expect(result).toEqual({ a: 'a-1', b: 'b-2' });
  });

  it('handles empty object', () => {
    const obj = {};
    const result = mapValues(obj, (value) => value);
    expect(result).toEqual({});
  });
});

describe('isEmpty', () => {
  it('returns true for null', () => {
    expect(isEmpty(null)).toBe(true);
  });

  it('returns true for undefined', () => {
    expect(isEmpty(undefined)).toBe(true);
  });

  it('returns true for empty string', () => {
    expect(isEmpty('')).toBe(true);
  });

  it('returns false for non-empty string', () => {
    expect(isEmpty('hello')).toBe(false);
  });

  it('returns true for empty array', () => {
    expect(isEmpty([])).toBe(true);
  });

  it('returns false for non-empty array', () => {
    expect(isEmpty([1, 2])).toBe(false);
  });

  it('returns true for empty object', () => {
    expect(isEmpty({})).toBe(true);
  });

  it('returns false for non-empty object', () => {
    expect(isEmpty({ a: 1 })).toBe(false);
  });

  it('returns false for zero', () => {
    expect(isEmpty(0)).toBe(false);
  });

  it('returns false for false', () => {
    expect(isEmpty(false)).toBe(false);
  });

  it('returns false for numbers', () => {
    expect(isEmpty(42)).toBe(false);
  });
});

