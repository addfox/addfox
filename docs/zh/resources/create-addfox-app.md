---
title: create-addfox-app
---

# create-addfox-app

交互式脚手架，通过几个选项生成一个新的 Addfox 浏览器扩展项目。

## 用法

作为 `addfox` 的子命令使用：

```bash
addfox create [project-name]
# 或
npx addfox@latest create [project-name]
```

或使用旧版包名：

```bash
npx create-addfox-app [project-name]
# 或
pnpm create addfox-app [project-name]
```

## 流程

1. 选择框架：`vanilla`、`vue`、`react`、`preact`、`svelte`、`solid`
2. 选择语言：**TypeScript** 或 **JavaScript**
3. 选择包管理器：`pnpm`、`npm`、`yarn`、`bun`
4. 选择要包含的入口（可多选）
5. 是否安装 Addfox skills

项目会生成到当前目录，或你指定的目录中。

## 输出

生成的项目包含：

- `addfox.config.ts`（或 `.js`），带最小化 manifest 和入口自动发现
- 与所选框架和入口匹配的脚手架
- 默认情况下 manifest 中不写死任何入口路径

## 模板

模板随包一起发布在 `templates/` 目录下（如 `template-vanilla-ts`、`template-react-ts`）。选中的模板会被复制到新项目中，无需远程下载。模板的 `addfox.config` 会被保留；CLI 只在你选择 Less/Sass 等样式引擎时合并对应的 Rsbuild 插件。
