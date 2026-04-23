# Changesets

本仓库使用 [Changesets](https://github.com/changesets/changesets) 管理版本与发布，仅对 `packages/` 下的可发布包做版本管理，`examples/*` 已忽略。

## 日常流程

1. **添加 changeset**（改完代码后）  
   在仓库根目录执行：
   ```bash
   pnpm changeset
   ```
   按提示选择要发版的包、版本类型（major/minor/patch）并写一条变更说明，会在 `.changeset/` 下生成一个 markdown 文件。

2. **提交**  
   将新增的 `.changeset/*.md` 与代码一起提交并推送到主分支。

## 发版流程

1. **更新版本与 CHANGELOG**  
   ```bash
   pnpm version
   ```
   会消费当前所有 changeset、给对应包升版本、更新依赖、生成/更新 CHANGELOG。

2. **安装依赖**  
   ```bash
   pnpm install
   ```
   更新 lockfile 与 workspace 内依赖引用。

3. **提交**  
   提交 `package.json`、`pnpm-lock.yaml` 以及 CHANGELOG 等变更。

4. **构建并发布到 npm**  
   ```bash
   pnpm release
   ```
   会先执行 `packages:build`，再对所有有版本变更的包执行 `pnpm publish -r`。  
   作用域包 `@addfox/*` 首次发布或需要公开时，可使用：
   ```bash
   pnpm ci:publish
   ```
   （内部为 `pnpm publish -r --access public`）。

## CI 中自动发版

若在 GitHub Actions 等 CI 中发版，可配置：

- 在 main 分支合并含 changeset 的 PR 后，由 CI 执行 `pnpm version` 并提交、打 tag。
- 再在 CI 中执行 `pnpm ci:publish` 并配置 `NPM_TOKEN` 等鉴权。

这样版本与发布都通过 changeset + pnpm workspace 统一管理。
