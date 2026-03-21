# appDir

`appDir` is the **app directory**, defaulting to `app/`. It is used as **baseDir for [entry](/config/entry)** and as the **root for manifest auto-load**.

## Type and default

- **Type**: `string | undefined`
- **Default**: `"app"` (framework convention)
- **Resolved**: Framework resolves to an absolute path, e.g. `appDir: "src"` → `path.resolve(root, "src")`.

## Role

1. **baseDir for entry**  
   All [entry](/config/entry) paths are **relative to appDir**. E.g. `appDir: "src"` and `entry: { popup: "popup/index.ts" }` → `src/popup/index.ts`.

2. **Entry discovery**  
   When [entry](/config/entry) is not set, the framework discovers `background`, `content`, `popup`, `options`, `sidepanel`, `devtools` under appDir by directory name.

3. **Manifest auto-load**  
   When [manifest](/config/manifest) is not set in config, the framework looks for:
   - `appDir/manifest.json`, `appDir/manifest.chromium.json`, `appDir/manifest.firefox.json`
   - `appDir/manifest/manifest.json`, etc.

## Examples

### App in `src/`

```ts
// addfox.config.ts
import { defineConfig } from "addfox";

export default defineConfig({
  appDir: "src",
  entry: {
    background: "background/index.ts",
    content: "content/index.ts",
    popup: "popup/index.ts",
    options: "options/index.ts",
  },
});
```

### `app/` as source (default)

```ts
export default defineConfig({
  // appDir omitted → "app"
  entry: { background: "background/index.ts", popup: "popup/index.ts" },
});
```

## Related

- [entry](/config/entry), [manifest](/config/manifest): Paths and auto-load are relative to appDir.
