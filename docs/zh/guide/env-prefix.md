# 环境变量

Addfox 支持通过 `.env` 文件管理环境变量，可以安全地在客户端代码中使用。

## 基础用法

在项目根目录创建 `.env` 文件：

```bash
# .env
ADDFOX_PUBLIC_API_URL=https://api.example.com
ADDFOX_PUBLIC_APP_NAME=My Extension
ADDFOX_PRIVATE_API_KEY=secret_key_here
```

## 默认前缀

Addfox 默认只暴露以 `ADDFOX_PUBLIC_` 开头的环境变量：

```ts
// app/popup/index.tsx
console.log(process.env.ADDFOX_PUBLIC_API_URL);   // ✅ "https://api.example.com"
console.log(process.env.ADDFOX_PUBLIC_APP_NAME);  // ✅ "My Extension"
console.log(process.env.ADDFOX_PRIVATE_API_KEY);  // ❌ undefined
console.log(process.env.PRIVATE_API_KEY);         // ❌ undefined
```

## 生效范围

环境变量会注入到所有**客户端代码**入口：

- **background** — Service Worker / Background script
- **content** — Content Script
- **popup** — 弹窗页面
- **options** — 选项页
- **sidepanel** — 侧边栏
- **devtools** — 开发者工具

:::tip 服务端与客户端区别
- `manifest` 配置中的 `process.env.*` 在**构建时**解析（服务端）
- 入口代码中的 `process.env.*` 在**运行时**可用（客户端）

:::

## 内置变量

Addfox 自动注入以下内置变量，无需在 `.env` 中定义：

| 变量名 | 说明 | 示例值 |
|--------|------|--------|
| `process.env.BROWSER` | 当前构建的浏览器 | `chrome`, `firefox` |
| `process.env.NODE_ENV` | 当前环境 | `development`, `production` |
| `process.env.ADDFOX_VERSION` | Addfox 版本号 | `1.0.0` |

## 不同环境

### 开发环境

创建 `.env.development`：

```bash
# .env.development
ADDFOX_PUBLIC_API_URL=http://localhost:3000
ADDFOX_PUBLIC_DEBUG=true
```

### 生产环境

创建 `.env.production`：

```bash
# .env.production
ADDFOX_PUBLIC_API_URL=https://api.example.com
ADDFOX_PUBLIC_DEBUG=false
```

### 环境文件优先级

1. `.env.{mode}.local` — 本地特定模式（最高优先级，不提交到 Git）
2. `.env.{mode}` — 特定模式
3. `.env.local` — 本地环境（不提交到 Git）
4. `.env` — 默认（最低优先级）

## 完整示例

```bash
# .env
ADDFOX_PUBLIC_API_URL=https://api.example.com
ADDFOX_PUBLIC_FEATURE_FLAG=true
ADDFOX_PRIVATE_DATABASE_URL=secret
```

```ts
// addfox.config.ts
export default defineConfig({
  manifest: {
    name: process.env.ADDFOX_PUBLIC_APP_NAME || "My Extension",
  },
});
```

```ts
// app/popup/index.tsx
const apiUrl = process.env.ADDFOX_PUBLIC_API_URL;
const showFeature = process.env.ADDFOX_PUBLIC_FEATURE_FLAG === "true";
```

## 注意事项

- 环境变量值都是字符串
- 布尔值需要手动转换：`process.env.ADDFOX_PUBLIC_DEBUG === "true"`
- 修改 `.env` 文件后需要重启开发服务器
- 不要在客户端代码中使用非 `ADDFOX_PUBLIC_` 前缀的变量，它们会是 `undefined`
