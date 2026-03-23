# appDir

`appDir` はアプリケーションのソースコードディレクトリを指定するために使用され、エントリーの検出と manifest の自動読み込みの基準パスとなります。

## 概要

- **型**: `string`
- **デフォルト値**: `"app"`
- **必須**: いいえ

## 使い方

```ts
// addfox.config.ts
import { defineConfig } from "addfox";

export default defineConfig({
  appDir: "src",  // src ディレクトリをアプリケーションのルートとして使用
});
```

## 機能

`appDir` を設定すると、以下の動作に影響を与えます：

1. **エントリー検出** — `appDir` ディレクトリから自動的にエントリーを検出
2. **entry パス解決** — `entry` 設定のパスは `appDir` からの相対パス
3. **manifest 読み込み** — `appDir` またはそのサブディレクトリから manifest ファイルを読み込み

## 例

### src ディレクトリの使用

```ts
// addfox.config.ts
export default defineConfig({
  appDir: "src",
});
```

ディレクトリ構造：

```tree
my-extension/
├── src/                    # アプリケーションソースコード
│   ├── background/
│   │   └── index.ts
│   ├── content/
│   │   └── index.ts
│   ├── popup/
│   │   └── index.tsx
│   └── manifest.json
├── addfox.config.ts
└── package.json
```

### プロジェクトルートの使用

```ts
// addfox.config.ts
export default defineConfig({
  appDir: ".",  // プロジェクトルートを使用
});
```

## 注意事項

- `appDir` は絶対パスに解決されます（プロジェクトルートからの相対パス）
- デフォルトの `"app"` または一般的な `"src"` を維持することをお勧めします。チーム協力が容易になります
- `appDir` を変更した後は、`entry` のパスも適切に更新してください

## 関連設定

- [`entry`](/ja/config/entry) - エントリー設定
- [`manifest`](/ja/config/manifest) - 拡張機能マニフェスト設定
- [guide/app-dir](/ja/guide/app-dir) - ディレクトリ構造ガイド
