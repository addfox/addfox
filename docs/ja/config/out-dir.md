# outDir

`outDir` はビルド出力のディレクトリ名を指定するために使用されます。

## 概要

- **型**: `string`
- **デフォルト値**: `"extension"`
- **必須**: いいえ

## 使い方

```ts
// addfox.config.ts
import { defineConfig } from "addfox";

export default defineConfig({
  outDir: "dist",  // .addfox/dist/ に出力
});
```

## 完全な出力パス

最終的な出力パスは以下の部分で構成されます：

```
{outputRoot}/{outDir}/
```

- `outputRoot`：固定で `.addfox`
- `outDir`：デフォルトは `"extension"`、カスタマイズ可能

デフォルトの完全パス：`.addfox/extension/`

## 例

### dist に変更

```ts
export default defineConfig({
  outDir: "dist",
});
```

出力ディレクトリ：`.addfox/dist/`

### ビルド成果物の構造

```
.addfox/
├── dist/                   # ビルド出力（outDir: "dist"）
│   ├── manifest.json
│   ├── background/
│   │   └── index.js
│   ├── content/
│   │   └── index.js
│   └── popup/
│       ├── index.html
│       └── index.js
└── cache/                  # ビルドキャッシュ
```

## 注意事項

- `outDir` は出力ディレクトリの名前のみに影響し、親ディレクトリ `.addfox` は固定です
- `outDir` を変更した後、manifest のパスは自動的に更新されます
- 開発時にブラウザが読み込む拡張機能ディレクトリもこのパスです

## 関連設定

- [`zip`](/ja/config/zip) - パッケージング設定
- [guide/output](/ja/guide/output) - 出力ガイド
