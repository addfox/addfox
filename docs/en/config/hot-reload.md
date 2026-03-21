# hotReload

`hotReload` configures **dev‑mode HMR** behaviour for the extension: the WebSocket port used by the reload manager and whether content pages are auto‑refreshed when content scripts change.

## Type and defaults

- **Type**:
  ```ts
  hotReload?: {
    port?: number;
    autoRefreshContentPage?: boolean;
  };
  ```
- **Defaults**:
  - `port`: `23333` (matches core `HMR_WS_PORT`)
  - `autoRefreshContentPage`: `true`

## Role

- Only used in **dev** (`addfox dev`):
  - `port` becomes the WebSocket server port used by the HMR plugin
  - `autoRefreshContentPage` controls whether the reload manager automatically refreshes the active tab when a **content entry** changes
- Has no effect on `addfox build`.

## Examples

### Custom HMR port

```ts
export default defineConfig({
  hotReload: {
    port: 30001,
  },
});
```

### Disable auto refresh for content pages

```ts
export default defineConfig({
  hotReload: {
    autoRefreshContentPage: false,
  },
});
```

### Custom port + no auto refresh

```ts
export default defineConfig({
  hotReload: {
    port: 31000,
    autoRefreshContentPage: false,
  },
});
```

## Related

- [`launch`](/config/launch): which browser dev mode opens (or use CLI `-b/--browser`).
- Dev plugin [@addfox/rsbuild-plugin-extension-hmr](https://github.com/addfox/addfox/tree/main/packages/plugins/rsbuild-plugin-extension-hmr).
