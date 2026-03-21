# addfox-with-env-vars

用于验证在 Addfox 中哪些环境变量会被打包暴露到扩展代码。

## 核心规则

- 默认仅注入 `ADDFOX_PUBLIC_*`
- 非 `ADDFOX_PUBLIC_*`（例如 `ADDFOX_PRIVATE_TOKEN`）不会注入到客户端代码
- 同时支持读取：
  - `import.meta.env.BROWSER`
  - `import.meta.env.MANIFEST_VERSION`

## 示例文件

- `.env.development`
  - `ADDFOX_PUBLIC_LABEL=dev-public`
  - `ADDFOX_PRIVATE_TOKEN=dev-private-token`
- `.env.production`
  - `ADDFOX_PUBLIC_LABEL=prod-public`
  - `ADDFOX_PRIVATE_TOKEN=prod-private-token`
- `app/envProbe.ts`：统一读取并格式化输出
- `app/background/index.ts` / `app/content/index.ts` / `app/popup/index.ts`：运行时打印结果

## 运行开发环境验证

```bash
cd examples/addfox-with-env-vars
pnpm install
pnpm dev
```

打开扩展的 popup，或看 background/content 控制台，你应当看到：

- `publicLabel` / `publicApiUrl` 有值（来自 `.env.development`）
- `privateToken` / `internalFlag` 为 `undefined`
- `browser` 为 `"chromium"`（取决于 `-b`）
- `manifestVersion` 为 `"3"`

## 运行生产环境验证

```bash
cd examples/addfox-with-env-vars
pnpm build
```

构建后加载 `.addfox/extension/extension-chromium`，打开 popup / 控制台确认：

- `publicLabel` 切换为 `prod-public`
- `privateToken` 仍然是 `undefined`

## 你可以继续手动测试

在 `.env.development` 或 `.env.production` 中新增变量：

- `ADDFOX_PUBLIC_X=ok` -> 应该可见
- `ADDFOX_SECRET_X=no` -> 应该不可见

然后重跑 `pnpm dev` 或 `pnpm build` 对比输出。
