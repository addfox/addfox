<p align="center">
  <img width="200" src="https://raw.githubusercontent.com/addfox/addfox/main/addfox.png" alt="Addfox">
</p>

# @addfox/core

[中文](README-zh_CN.md) | English

---

addfox core: types, config loading, entry discovery/resolution, manifest building, errors and constants. Consumed by CLI and plugins; can be used directly in custom scripts.

- **defineConfig**: config helper, returns user config
- **ConfigLoader / resolveAddfoxConfig**: load addfox.config and resolve to full config + entry list
- **EntryDiscoverer / EntryResolver**: discover entries from dirs or resolve from `entry` config
- **ManifestBuilder**: build per-browser manifest from config and entries
- **CliParser**: parse `addfox dev|build [-b chrome|edge|brave|vivaldi|opera|santa|firefox]`
- **mergeRsbuildConfig**: deep-merge Rsbuild config
- **AddfoxError / create*Error**: unified error type and factories
