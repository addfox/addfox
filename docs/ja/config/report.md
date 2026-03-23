# report

`report` は Rsdoctor ビルド分析レポートを有効にするために使用されます。

## 概要

- **型**: `boolean | RsdoctorReportOptions`
- **デフォルト値**: `false`
- **必須**: いいえ

## 使い方

```ts
// addfox.config.ts
import { defineConfig } from "addfox";

export default defineConfig({
  report: true,  // Rsdoctor レポートを有効にする
});
```

## 設定方法

### ブール値

```ts
export default defineConfig({
  report: true,   // レポートを有効にする
  // report: false, // レポートを無効にする（デフォルト）
});
```

### オブジェクト形式

Rsdoctor 設定オプションを渡します：

```ts
export default defineConfig({
  report: {
    mode: "normal",
    port: 9988,
    disableClientServer: false,
  },
});
```

## Rsdoctor オプション

| オプション | 型 | 説明 |
|------|------|------|
| `mode` | `"brief" \| "normal" \| "lite"` | レポートモード |
| `port` | `number` | レポートサーバーポート |
| `disableClientServer` | `boolean` | クライアントサーバーを無効にするかどうか |
| `output` | `object` | 出力設定 |

詳細なオプションについては [Rsdoctor ドキュメント](https://rsdoctor.rs/config/options/options) を参照してください。

## CLI で有効にする

```bash
# レポートを有効にする
addfox dev -r
addfox build -r

# または --report を使用
addfox dev --report
```

CLI パラメータは設定の `report` 値を上書きします。

## レポート内容

有効にすると、ビルド完了時に自動的に分析レポートページが開き、以下が含まれます：

- ビルド時間分析
- モジュール依存関係
- パッケージサイズ分析
- 重複依存関係の検出
- コンパイル警告とエラー

## 注意事項

- レポート機能はビルド時間を増加させます
- ビルド問題の調査時に有効にすることをお勧めします
- 本番ビルドでも使用可能です

## 関連リンク

- [Rsdoctor 公式ドキュメント](https://rsdoctor.rs/)
