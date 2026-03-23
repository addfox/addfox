# 環境変数

Addfox は `.env` ファイルを介した環境変数の管理をサポートし、クライアントコードで安全に使用できます。

## 基本使用方法

プロジェクトルートに `.env` ファイルを作成：

```bash
# .env
ADDFOX_PUBLIC_API_URL=https://api.example.com
ADDFOX_PUBLIC_APP_NAME=My Extension
ADDFOX_PRIVATE_API_KEY=secret_key_here
```

## デフォルトプレフィックス

Addfox はデフォルトで `ADDFOX_PUBLIC_` で始まる環境変数のみを公開します：

```ts
// app/popup/index.tsx
console.log(process.env.ADDFOX_PUBLIC_API_URL);   // ✅ "https://api.example.com"
console.log(process.env.ADDFOX_PUBLIC_APP_NAME);  // ✅ "My Extension"
console.log(process.env.ADDFOX_PRIVATE_API_KEY);  // ❌ undefined
console.log(process.env.PRIVATE_API_KEY);         // ❌ undefined
```

## 有効範囲

環境変数はすべての**クライアントコード**エントリーに注入されます：

- **background** — Service Worker / Background script
- **content** — Content Script
- **popup** — ポップアップページ
- **options** — オプションページ
- **sidepanel** — サイドパネル
- **devtools** — 開発者ツール

:::tip サーバーとクライアントの違い
- `manifest` 設定の `process.env.*` は**ビルド時**に解決されます（サーバー側）
- エントリーコードの `process.env.*` は**実行時**に使用可能です（クライアント側）

:::

## 組み込み変数

Addfox は自動的に以下の組み込み変数を注入し、`.env` で定義する必要はありません：

| 変数名 | 説明 | 例の値 |
|--------|------|--------|
| `process.env.BROWSER` | 現在のビルド対象ブラウザ | `chrome`、`firefox` |
| `process.env.NODE_ENV` | 現在の環境 | `development`、`production` |
| `process.env.ADDFOX_VERSION` | Addfox のバージョン番号 | `1.0.0` |

## 異なる環境

### 開発環境

`.env.development` を作成：

```bash
# .env.development
ADDFOX_PUBLIC_API_URL=http://localhost:3000
ADDFOX_PUBLIC_DEBUG=true
```

### 本番環境

`.env.production` を作成：

```bash
# .env.production
ADDFOX_PUBLIC_API_URL=https://api.example.com
ADDFOX_PUBLIC_DEBUG=false
```

### 環境ファイルの優先順位

1. `.env.{mode}.local` — ローカル固有モード（最高優先度、Git にコミットしない）
2. `.env.{mode}` — 固有モード
3. `.env.local` — ローカル環境（Git にコミットしない）
4. `.env` — デフォルト（最低優先度）

## 完全な例

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

## 注意事項

- 環境変数の値はすべて文字列です
- ブール値は手動で変換する必要があります：`process.env.ADDFOX_PUBLIC_DEBUG === "true"`
- `.env` ファイルを変更した後、開発サーバーを再起動する必要があります
- クライアントコードでは `ADDFOX_PUBLIC_` プレフィックスのない変数を使用しないでください。これらは `undefined` になります
