# Rsbuild config (rsbuild)

`rsbuild` overrides or extends the Rsbuild configuration. It supports **object** (deep-merged with base) or **function** form for full control.

## Object form

```ts
export default defineConfig({
  rsbuild: {
    source: { define: { __APP_NAME__: JSON.stringify("my-ext") } },
    resolve: { alias: { "@": "/src" } },
  },
});
```

## Function form

```ts
export default defineConfig({
  rsbuild(base, helpers) {
    return helpers!.merge(base, {
      source: { define: { __ENV__: JSON.stringify(process.env.NODE_ENV) } },
    });
  },
});
```

## Related

- [Framework support](/guide/framework/vue): plugins and rsbuild work together.
