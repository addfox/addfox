# outDir

`outDir` is the **build output directory name**, under [outputRoot](/config/out-dir). The full output path is `outputRoot/outDir`, default `.addfox/extension`.

## Type and default

- **Type**: `string | undefined`
- **Default**: `"extension"`
- **Full path**: `path.resolve(root, outputRoot, outDir)`.

## Role

- All entry outputs (JS, CSS, HTML) and the generated [manifest](/config/manifest) `manifest.json` go under this directory.
- `addfox dev` loads the extension from this path.
- When [zip](/config/zip) is enabled, `addfox build` produces `outDir.zip` (e.g. `extension.zip`) under outputRoot.

## Examples

### Default

```ts
export default defineConfig({
  // outDir default "extension" → output at .addfox/extension
});
```

### Custom name

```ts
export default defineConfig({
  outDir: "build",
  outputRoot: ".addfox",
  // output at .addfox/build
});
```

## Related

- [outputRoot](/config/out-dir), [zip](/config/zip).
