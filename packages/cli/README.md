<p align="center">
  <img width="200" src="https://raw.githubusercontent.com/addfox/addfox/main/addfox.png" alt="Addfox">
</p>

# @addfox/cli

[中文](README-zh_CN.md) | English

---

addfox CLI entry: parses argv, runs pipeline (load config → build Rsbuild config), wraps output with prefix, and runs Rsbuild for `dev` / `build`.

- Commands: `addfox dev`, `addfox build [-b chrome|edge|brave|vivaldi|opera|santa|firefox]`
- Depends on `@addfox/core` for config and entry resolution; depends on plugins for Rsbuild logic

See [docs/HMR_AND_WATCH.md](docs/HMR_AND_WATCH.md) for why HMR is disabled in dev (build watch) and how Tailwind/PostCSS interacts with watch mode.
