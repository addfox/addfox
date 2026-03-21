# @addfox/rsbuild-plugin-extension-manifest

[中文](README-zh_CN.md) | English

---

Rsbuild plugin: after build, writes manifest.json (per-browser) based on CLI `-b`/`--browser` (launch target). Injected by CLI pipeline.

- Uses `@addfox/core`'s `resolveManifestForTarget` to build the final manifest
- Handles content script output (JS/CSS) for `[addfox.content]` placeholder expansion
- Auto-detects shadow/iframe content UI usage to control CSS auto-fill in manifest
- Validates entry HTML rules (e.g. popup must have HTML, background cannot have HTML in MV3)
