# @addfox/cli

[English](README.md) | 中文

---

addfox CLI 入口：解析 argv、运行流水线（加载配置 → 构建 Rsbuild 配置）、为输出加前缀并执行 Rsbuild 的 `dev` / `build`。

- 命令：`addfox dev`、`addfox build [-b chrome|edge|brave|vivaldi|opera|santa|firefox]`
- 依赖 `@addfox/core` 做配置与入口解析；依赖各插件提供 Rsbuild 逻辑

详见 [docs/HMR_AND_WATCH.md](docs/HMR_AND_WATCH.md) 了解 dev 下为何禁用 HMR（build watch）以及 Tailwind/PostCSS 与 watch 模式的配合。
