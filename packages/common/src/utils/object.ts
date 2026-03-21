/**
 * Object utilities
 */

/**
 * Deep merge objects
 */
export function deepMerge<T extends Record<string, unknown>>(
  target: T,
  source: Record<string, unknown>
): T {
  const result = { ...target };
  
  for (const key of Object.keys(source)) {
    const sourceValue = source[key];
    const targetValue = result[key];
    
    if (
      sourceValue !== null &&
      typeof sourceValue === 'object' &&
      !Array.isArray(sourceValue) &&
      targetValue !== null &&
      typeof targetValue === 'object' &&
      !Array.isArray(targetValue)
    ) {
      result[key as keyof T] = deepMerge(
        targetValue as Record<string, unknown>,
        sourceValue as Record<string, unknown>
      ) as T[keyof T];
    } else {
      result[key as keyof T] = sourceValue as T[keyof T];
    }
  }
  
  return result;
}

/**
 * Pick properties from object
 */
export function pick<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[]
): Pick<T, K> {
  const result = {} as Pick<T, K>;
  
  for (const key of keys) {
    if (key in obj) {
      result[key] = obj[key];
    }
  }
  
  return result;
}

/**
 * Omit properties from object
 */
export function omit<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> {
  const result = { ...obj };
  
  for (const key of keys) {
    delete result[key];
  }
  
  return result as Omit<T, K>;
}

/**
 * Get nested property value
 */
export function get<T>(obj: unknown, path: string, defaultValue?: T): T | undefined {
  const keys = path.split('.');
  let current: unknown = obj;
  
  for (const key of keys) {
    if (current === null || current === undefined) {
      return defaultValue;
    }
    current = (current as Record<string, unknown>)[key];
  }
  
  return current as T | undefined ?? defaultValue;
}

/**
 * Set nested property value
 */
export function set<T extends Record<string, unknown>>(
  obj: T,
  path: string,
  value: unknown
): T {
  const keys = path.split('.');
  const result = { ...obj };
  let current: Record<string, unknown> = result;
  
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!(key in current) || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  }
  
  current[keys[keys.length - 1]] = value;
  return result;
}

/**
 * Check if object has property
 */
export function has(obj: unknown, path: string): boolean {
  const keys = path.split('.');
  let current: unknown = obj;
  
  for (const key of keys) {
    if (
      current === null ||
      current === undefined ||
      typeof current !== 'object' ||
      !(key in (current as object))
    ) {
      return false;
    }
    current = (current as Record<string, unknown>)[key];
  }
  
  return true;
}

/**
 * Flatten object
 */
export function flatten(
  obj: Record<string, unknown>,
  prefix = ''
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key;
    
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flatten(value as Record<string, unknown>, newKey));
    } else {
      result[newKey] = value;
    }
  }
  
  return result;
}

/**
 * Unflatten object
 */
export function unflatten(obj: Record<string, unknown>): Record<string, unknown> {
  let result: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    result = set(result, key, value);
  }
  
  return result;
}

/**
 * Filter object by predicate
 */
export function filter<T extends Record<string, unknown>>(
  obj: T,
  predicate: (key: string, value: unknown) => boolean
): Partial<T> {
  const result: Partial<T> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (predicate(key, value)) {
      result[key as keyof T] = value as T[keyof T];
    }
  }
  
  return result;
}

/**
 * Map object values
 */
export function mapValues<T extends Record<string, unknown>, U>(
  obj: T,
  fn: (value: T[keyof T], key: string) => U
): Record<keyof T, U> {
  const result = {} as Record<keyof T, U>;
  
  for (const [key, value] of Object.entries(obj)) {
    result[key as keyof T] = fn(value as T[keyof T], key);
  }
  
  return result;
}

/**
 * Check if value is plain object
 */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') {
    return false;
  }
  
  const proto = Object.getPrototypeOf(value);
  return proto === null || proto === Object.prototype;
}

/**
 * Check if value is empty
 */
export function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) {
    return true;
  }
  
  if (typeof value === 'string' || Array.isArray(value)) {
    return value.length === 0;
  }
  
  if (isPlainObject(value)) {
    return Object.keys(value).length === 0;
  }
  
  return false;
}
