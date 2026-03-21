# Manifest

`manifest` declares the extension manifest (the content of the final `manifest.json` in the build output). It supports **inline object**, **object split by browser** (chromium/firefox), or **file paths**; it can also be **omitted** for auto-load from the source directory.

## Type and default

- **Type**: `ManifestConfig | ManifestPathConfig | undefined`
- **Default**: When omitted, the framework loads from `appDir` or `appDir/manifest/`: `manifest.json`, `manifest.chromium.json`, `manifest.firefox.json`.

## Configuration styles

### 1. Single object (Chrome / Firefox shared)

Entry paths are computed from [entry](/guide/entry) and [output](/guide/output).

> Entry output paths are computed by the framework from [entry](/guide/entry) and [output](/guide/output). Keep manifest fields semantically correct and let Addfox resolve generated paths.

### 2. Per-browser (chromium / firefox)

Use `manifest: { chromium: { ... }, firefox: { ... } }`.

### 3. File paths (relative to appDir)

Use `manifest: { chromium: "manifest/manifest.chromium.json", firefox: "manifest/manifest.firefox.json" }`.

### 4. Omit (auto-load)

The framework looks for manifest files under `appDir`.

## Related

- [entry](/guide/entry), [appDir](/guide/app-dir), [output](/guide/output).
