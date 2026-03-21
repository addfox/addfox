# Analysis Report

Addfox uses **Rsdoctor** to provide build analysis reports for bundle size, dependency structure, and build bottlenecks.

## Typical use cases

- Unexpected bundle size growth
- Slower builds after recent changes
- Need to inspect chunk split and duplicated dependencies

## Enable

From CLI:

```bash
addfox build --report
```

Or via config:

```ts
export default defineConfig({
  report: true,
});
```

## What you can inspect

- Entry/chunk split details
- Dependency size distribution and duplication
- Build phase timing

## Recommended workflow

1. Generate a baseline report.
2. Generate another report after major changes.
3. Compare size and timing deltas before optimizing.

## Related

- [Config: report](/config/report)
- [Config: rsbuild](/config/rsbuild)
- [Rsdoctor official docs](https://rsdoctor.rs/)
