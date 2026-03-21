<p align="center">
  <img width="200" src="https://raw.githubusercontent.com/addfox/addfox/main/addfox.png" alt="Addfox">
</p>

# @addfox/common

Shared utilities for Addfox packages.

## Installation

```bash
npm install @addfox/common
# or
pnpm add @addfox/common
```

## Cache Utilities

```typescript
import { createCache, memoize } from '@addfox/common';

// Create a cache
const cache = createCache<string>();
cache.set('key', 'value', 60000); // 60 second TTL
const value = cache.get('key');

// Memoize a function
const expensiveFn = memoize((n: number) => n * n);
expensiveFn(5); // computed
expensiveFn(5); // cached
```

## Pipeline Utilities

```typescript
import { pipe, compose, createPipeline } from '@addfox/common';

// Compose functions
const result = pipe(
  (x: number) => x + 1,
  (x) => x * 2,
  (x) => x.toString()
)(5); // "12"

// Create async pipeline
const pipeline = createPipeline(
  async (input: string) => input.toUpperCase(),
  async (input) => input.split(''),
  async (input) => input.join('-')
);
const result = await pipeline('hello'); // "H-E-L-L-O"
```

## Object Utilities

```typescript
import { deepMerge, pick, omit, get, set } from '@addfox/common';

// Deep merge
const merged = deepMerge({ a: { b: 1 } }, { a: { c: 2 } });
// { a: { b: 1, c: 2 } }

// Pick/omit properties
const picked = pick({ a: 1, b: 2, c: 3 }, ['a', 'c']); // { a: 1, c: 3 }
const omitted = omit({ a: 1, b: 2, c: 3 }, ['b']); // { a: 1, c: 3 }

// Get/set nested properties
const obj = { nested: { value: 42 } };
const value = get(obj, 'nested.value'); // 42
const newObj = set(obj, 'nested.other', 100);
```

## Error Utilities

```typescript
import { AddfoxError, createError, formatError } from '@addfox/common';

// Create error
const error = createError('CONFIG_ERROR', 'Failed to load config', {
  details: 'File not found',
  hint: 'Check the file path',
});

// Format error
console.log(formatError(error));
// [CONFIG_ERROR] Failed to load config
//   Details: File not found
//   Hint: Check the file path
```

## Types

```typescript
import type { 
  Logger, 
  Result, 
  ValidationResult,
  Strategy,
  Pipeline,
  Middleware 
} from '@addfox/common';
```

## License

MIT
