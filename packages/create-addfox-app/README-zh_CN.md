<p align="center">
  <img width="200" src="https://raw.githubusercontent.com/addfox/addfox/main/addfox.png" alt="Addfox">
</p>

# create-addfox-app

[English](README.md) | 中文

---

交互式脚手架：根据选项（模板、依赖、addfox.config 等）生成基于 addfox 的扩展项目。

- 命令：`create-addfox-app` 或 `pnpm create addfox-app`
- 输出到当前目录或指定目录
- 脚手架模板位于本包的 **`templates/`** 目录，随 npm 包发布，创建项目时本地复制，无需从 GitHub 下载；**`addfox.config`（含 manifest）会保留**，仅在选用 Less/Sass 时合并对应 Rsbuild 插件；若无配置文件则生成完整回退配置
