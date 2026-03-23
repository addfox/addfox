# zip

`zip` はビルド完了後に出力ディレクトリを zip ファイルにパッケージングするかどうかを制御するために使用されます。

## 概要

- **型**: `boolean`
- **デフォルト値**: `true`
- **必須**: いいえ

## 使い方

```ts
// addfox.config.ts
import { defineConfig } from "addfox";

export default defineConfig({
  zip: true,   // ビルド完了後にパッケージング
  // zip: false, // パッケージングしない
});
```

## 出力位置

パッケージファイルの出力パス：

```
{outputRoot}/{outDir}.zip
```

デフォルト：`.addfox/extension.zip`

## 例

### パッケージングを無効にする

```ts
export default defineConfig({
  zip: false,
});
```

### パッケージングを有効にする（デフォルト）

```ts
export default defineConfig({
  zip: true,
});
```

または設定しない（デフォルト値を使用）。

## パッケージング内容

zip ファイルにはビルド出力のすべての内容が含まれます：

- `manifest.json`
- すべてのエントリースクリプトとページ
- `public/` ディレクトリの静的リソース

## 用途

パッケージングされた zip ファイルは以下に使用できます：
- Chrome Web Store への提出
- Firefox Add-ons への提出
- 配布とバックアップ

## 関連設定

- [`outDir`](/ja/config/out-dir) - 出力ディレクトリ設定
- [guide/zip](/ja/guide/zip) - パッケージングガイド
