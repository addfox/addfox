# Build report (Rsdoctor)

When enabled, addfox generates an **Rsdoctor** report for build analysis. The report is written under **`outputRoot/report`** (default **`.addfox/report`**), separate from the dist output.

## Enabling

- **CLI**: `addfox build -r` or `addfox build --report`
- **Config**: `report: true` in addfox.config

```ts
export default defineConfig({
  report: true,
});
```

## Output

- **Path**: `path.resolve(root, outputRoot, "report")`, e.g. `.addfox/report`
- **Content**: Rsdoctor report (from `@rsdoctor/rspack-plugin`). Open the generated `index.html` in a browser to view compilation and bundle insights.

## Known limitation: Bundle Size tab

With **multi-entry extension builds** (popup, options, content, background, etc.), the Rsdoctor UI **Bundle Size** tab may crash with:

```tree
TypeError: Cannot destructure property 'size' of 'en.find(...)' as it is undefined.
```

This comes from the Rsdoctor client when some chunk does not have a matching size entry in the report data. It is an upstream/client bug, not addfox code.

**Workarounds:**

- Use other Rsdoctor tabs (e.g. Overview, Modules, Compilation) for analysis.
- Try upgrading `@rsdoctor/rspack-plugin` / `@rsdoctor/core` to a newer version.
- If the issue persists, consider opening an issue at [web-infra-dev/rsdoctor](https://github.com/web-infra-dev/rsdoctor).

## Related

- [outputRoot](/config/out-dir), [outDir](/config/out-dir): dist output paths.
