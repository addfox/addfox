Addfox のビルド成果物はデフォルトで `.addfox/extension/` のブラウザ固有のサブディレクトリに出力されます（例：`extension-chromium` または `extension-firefox`）。

## デフォルトの出力構造

```tree
.addfox/
├── extension/
│   ├── extension-chromium/  # Chromium 成果物
│   │   ├── manifest.json
│   │   ├── background/
│   │   │   └── index.js
│   │   ├── content/
│   │   │   ├── index.js
│   │   │   └── index.css
│   │   ├── popup/
│   │   │   ├── index.html
│   │   │   └── index.js
│   │   ├── options/
│   │   │   ├── index.html
│   │   │   └── index.js
│   │   └── icons/
│   │       └── icon*.png
│   └── extension-firefox/   # Firefox 成果物
└── cache/                   # 開発キャッシュ
```

## カスタム出力ディレクトリ

`outDir` 設定を使用して出力ディレクトリ名を変更できます：

```ts
// addfox.config.ts
export default defineConfig({
  outDir: "dist",  // .addfox/dist/ に出力
});
```

## 出力内容の説明

### JavaScript ファイル

- すべてのエントリースクリプトは Rsbuild によってパックされた成果物
- コード変換、圧縮（本番モード）を含む
- Source map（開発モード）

### HTML ファイル

- Rsbuild によって自動生成されるか、カスタムテンプレートを使用
- 対応するエントリースクリプトが注入済み
- **自動生成**されたページ（カスタム `index.html` なし）には **`<div id="root"></div>`** が含まれます。**`<title>`` は拡張機能 **`manifest.name`** と一致します。**ページアイコン**は **`<link rel="icon">`** を介して **`manifest.icons`** を参照します。カスタム HTML テンプレートの場合は、自分で title とアイコンを管理する必要があります。

### CSS ファイル

- エントリースクリプトから `import` されたスタイル
- PostCSS 処理済み（Tailwind などが設定されている場合）

### Manifest

- 最終生成された `manifest.json`
- すべてのエントリーパスと設定を含む

### 静的リソース

- `public/` ディレクトリのファイルがそのままコピーされる
- 拡張機能アイコン、国際化ファイルなど

## 開発 vs 本番

### 開発モード (`addfox dev`)

- `.addfox/extension/` に出力
- Source map を含む
- コードは圧縮されていない
- ブラウザがこのディレクトリを直接読み込む

### 本番モード (`addfox build`)

- 同様に `.addfox/extension/` に出力
- コード圧縮最適化
- zip ファイルを生成可能（デフォルトで有効）

## パッケージング

ビルド完了後、デフォルトで zip にパッケージングされます：

```tree
.addfox/
├── extension/          # ビルド出力
└── extension.zip       # パッケージファイル（配布用）
```

`zip: false` で無効にできます：

```ts
export default defineConfig({
  zip: false,
});
```

## 関連設定

- [`outDir`](/ja/config/out-dir) - 出力ディレクトリ名
- [`zip`](/ja/config/zip) - パッケージング設定
