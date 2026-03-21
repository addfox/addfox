# zip

`zip` controls whether `addfox build` packs the output directory into a zip file (e.g. for store upload or distribution). Only affects **build**; **dev** does not produce a zip.

## Type and default

- **Type**: `boolean | undefined`
- **Default**: `true` (zip is produced)

## Behavior

- **`true` or omitted**: After build, creates `{outDir}.zip` under [outputRoot](/config/out-dir), e.g. `.addfox/extension.zip`, containing the full [outDir](/config/out-dir) contents.
- **`false`**: Only outputs the directory, no zip.

## Examples

### Default (zip on)

```ts
export default defineConfig({
  outDir: "extension",
  outputRoot: ".addfox",
  // zip true → .addfox/extension.zip
});
```

### Disable zip

```ts
export default defineConfig({
  zip: false,
  // only .addfox/extension, no zip
});
```

## Related

- [outDir](/config/out-dir), [outputRoot](/config/out-dir).
