# TypeScript

Addfox is built on top of Rsbuild and provides TypeScript support out of the box. You can use `.ts` / `.tsx` directly without adding an extra compile pipeline.

## Built-in support

- **Out-of-the-box transpilation**: `.ts` and `.tsx` are handled automatically.
- **Separated type checking**: build focuses on transpile and bundle; use `tsc --noEmit` or IDE diagnostics for type checks.
- **Works across all entries**: TypeScript can be used directly in `background`, `content`, `popup`, and `options`.

## Path aliases (reads tsconfig directly)

Addfox directly reads `compilerOptions.baseUrl` and `compilerOptions.paths` from `tsconfig.json` (or `tsconfig.base.json`) for module resolution.  
In practice, common alias setup does not need to be duplicated in Addfox config.

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["app/*"],
      "@shared/*": ["shared/*"]
    }
  }
}
```

Then import with aliases directly:

```ts
import { getEnv } from "@/shared/env";
import { logger } from "@shared/logger";
```

## Recommendation

- Keep alias definitions centralized in root `tsconfig`.
- Add `tsc --noEmit` in CI to catch type issues earlier.

## References

- [Rsbuild TypeScript Guide](https://rsbuild.rs/guide/basic/typescript)
