# 環境変数

Addfox は Rsbuild の `loadEnv` を使用して、プロジェクトルートの `.env` ファイルを読み込み、デフォルトでは `ADDFOX_PUBLIC_` で始まる変数のみをクライアントコードに公開します。

## デフォルトの動作

- **デフォルトプレフィックス**: `ADDFOX_PUBLIC_`
- **クライアントコード**: background、content、popup、options、sidepanel、devtools などのエントリー
- **読み込むファイル**: `.env`、`.env.local`、`.env.{mode}`、`.env.{mode}.local`

## 有効範囲

環境変数はすべての**クライアントコード**エントリーに注入されますが、`addfox.config.ts` の `manifest` 設定には**適用されません**（ここではビルド時の環境を使用）。

## 組み込み変数

Addfox は自動的に以下の変数を注入します：

| 変数名 | 説明 |
|--------|------|
| `process.env.BROWSER` | 現在のビルド対象ブラウザ |
| `process.env.NODE_ENV` | 現在の環境モード |
| `process.env.ADDFOX_VERSION` | Addfox のバージョン番号 |

## 使用例

### .env ファイル

```bash
ADDFOX_PUBLIC_API_URL=https://api.example.com
ADDFOX_PUBLIC_APP_NAME=My Extension
ADDFOX_PRIVATE_KEY=secret  # クライアントには公開されません
```

### コードでの使用

```ts
// app/popup/index.tsx
const apiUrl = process.env.ADDFOX_PUBLIC_API_URL;
```

## セキュリティに関する推奨事項

- クライアントに公開しても問題ない変数には常に `ADDFOX_PUBLIC_` プレフィックスを使用してください
- 機密情報（API キーなど）は `ADDFOX_PUBLIC_` で始めないでください
- `.env.local` と `.env.{mode}.local` ファイルは Git にコミットしないでください

## 関連ドキュメント

- [guide/env-prefix](/ja/guide/env-prefix) - 環境変数使用ガイド
