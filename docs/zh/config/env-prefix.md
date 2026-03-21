# 环境变量

Addfox 使用 Rsbuild 的 `loadEnv` 加载项目根目录的 `.env` 文件，并默认只暴露以 `ADDFOX_PUBLIC_` 开头的变量给客户端代码。

## 默认行为

- **默认前缀**：`ADDFOX_PUBLIC_`
- **客户端代码**：background、content、popup、options、sidepanel、devtools 等入口
- **加载文件**：`.env`、`.env.local`、`.env.{mode}`、`.env.{mode}.local`

## 生效范围

环境变量会注入到所有**客户端代码**入口，但**不会**在 `addfox.config.ts` 的 `manifest` 配置中生效（该处使用构建时环境）。

## 内置变量

Addfox 自动注入以下变量：

| 变量名 | 说明 |
|--------|------|
| `process.env.BROWSER` | 当前构建目标浏览器 |
| `process.env.NODE_ENV` | 当前环境 mode |
| `process.env.ADDFOX_VERSION` | Addfox 版本号 |

## 使用示例

### .env 文件

```bash
ADDFOX_PUBLIC_API_URL=https://api.example.com
ADDFOX_PUBLIC_APP_NAME=My Extension
ADDFOX_PRIVATE_KEY=secret  # 不会暴露给客户端
```

### 代码中使用

```ts
// app/popup/index.tsx
const apiUrl = process.env.ADDFOX_PUBLIC_API_URL;
```

## 安全建议

- 始终使用 `ADDFOX_PUBLIC_` 前缀来标记可以暴露给客户端的变量
- 敏感信息（如 API 密钥）不要以 `ADDFOX_PUBLIC_` 开头
- `.env.local` 和 `.env.{mode}.local` 文件不应提交到 Git

## 相关文档

- [guide/env-prefix](/guide/env-prefix) - 环境变量使用指南
