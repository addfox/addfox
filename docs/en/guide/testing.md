# Testing

Addfox has built-in support for **Rstest** and recommends running tests through `addfox test`.

## Check dependencies first

Before running tests, make sure required dependencies are installed:

```bash
pnpm add -D @rstest/core
```

For browser E2E tests, also install:

```bash
pnpm add -D @rstest/browser playwright
```

## Unified command

Use:

```bash
addfox test
```

This runs tests through the Addfox test workflow instead of manually wiring low-level commands.

## Unit Tests

Best for:

- utility functions
- message handlers
- storage/state logic

Common file naming:

- `*.test.ts`
- `*.spec.ts`

## E2E Tests

Best for:

- extension loading checks
- popup/content/background integration flows
- user-facing regression paths

Run E2E as part of CI or release validation.

## Minimal config example

```ts
// rstest.config.ts
import { defineConfig } from "@rstest/core";

export default defineConfig({
  test: {
    include: ["**/*.test.ts", "**/*.spec.ts"],
  },
});
```

## Suggested script

```json
{
  "scripts": {
    "test": "addfox test"
  }
}
```

## References

- [Rstest official docs](https://rstest.dev/)
- [Rstest browser testing guide](https://rstest.dev/guide/browser-testing)
