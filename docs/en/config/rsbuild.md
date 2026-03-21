# rsbuild

`rsbuild` **overrides or extends Rsbuild config** (similar to Vite's `build.rollupOptions`, `esbuild`, etc.). It supports **object** (deep-merged with base) or **function** (full control, with `helpers.merge` for deep merge).

## Type and default

- **Type**: `RsbuildConfig | ((base: RsbuildConfig, helpers?: RsbuildConfigHelpers) => RsbuildConfig | Promise<RsbuildConfig>) | undefined`
- **Default**: Omitted → only framework base config (entry, HTML, output, manifest write are set by built-in plugins).

## Object form: deep merge

An object is **deep-merged** with the framework base. Use for adding or overriding fields (e.g. `source.define`, `resolve.alias`).

```ts
// addfox.config.ts
import { defineConfig } from "addfox";

export default defineConfig({
  rsbuild: {
    source: {
      define: { __APP_NAME__: JSON.stringify("my-ext") },
    },
    resolve: {
      alias: { "@": "/src" },
    },
  },
});
```

## Function form: full control

A function receives `(base, helpers)`:
- **base**: Framework-generated Rsbuild config.
- **helpers.merge(base, overrides)**: Deep-merge overrides into base and return.

Use when you need env, async logic, or complex conditions.

```ts
export default defineConfig({
  rsbuild(base, helpers) {
    return helpers!.merge(base, {
      source: { define: { __ENV__: JSON.stringify(process.env.NODE_ENV) } },
    });
  },
});
```

Async:

```ts
export default defineConfig({
  async rsbuild(base, helpers) {
    const overrides = await loadSomeConfig();
    return helpers!.merge(base, overrides);
  },
});
```

## Common use cases

| Need | Example |
|------|---------|
| **define** | `rsbuild: { source: { define: { __BUILD_TIME__: JSON.stringify(Date.now()) } } }` |
| **alias** | `rsbuild: { resolve: { alias: { "@": "/src" } } }` |
| **Extra plugins** | In function form: `base.plugins = [...(base.plugins ?? []), myPlugin()]` or merge |
| **output** | Prefer merging in function form so you don't override framework `distPath`, `assetPrefix`, etc. |

## Notes

- The framework sets `output.distPath`, `output.cleanDistPath`, `output.assetPrefix`, and entry output filenames. Overriding `output` in rsbuild can break manifest paths; prefer incremental merge.

## Related

- [plugins](/config/plugins).
