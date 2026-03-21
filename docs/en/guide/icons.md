# Extension icons

In an Addfox project, extension icon assets (e.g. toolbar icon, store assets) live under the **`public`** directory. At build time, `public` is copied into the output directory (e.g. `dist`), so paths in the manifest should be relative to the extension root and point to files under `public` (e.g. `public/icons/icon16.png` → `icons/icon16.png` in the manifest).

A common setup is an `icons` folder under `public` with PNGs at 16, 32, 48, and 128 px, referenced in the manifest via `icons` or `action.default_icon`.

For required sizes, formats, and manifest fields, see Chrome’s official docs:

- [Manifest - icons](https://developer.chrome.com/docs/extensions/reference/manifest/icons)
