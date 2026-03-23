# manifest

`manifest` はブラウザ拡張機能のマニフェストを宣言するために使用されます。つまり、最終出力ディレクトリの `manifest.json` の内容です。

## 概要

- **型**: `ManifestConfig | ManifestPathConfig | undefined`
- **デフォルト値**: `undefined`（自動読み込み）
- **必須**: いいえ

## 設定方法

### 1. インラインオブジェクト（単一ブラウザ）

最も簡単な設定方法で、1つのブラウザのみをサポートする場合、または2つのブラウザで設定が同じ場合に適しています。

```ts
// addfox.config.ts
import { defineConfig } from "addfox";

export default defineConfig({
  manifest: {
    name: "マイ拡張機能",
    version: "1.0.0",
    manifest_version: 3,
    permissions: ["storage", "activeTab"],
    action: { default_popup: "popup/index.html" },
    background: { service_worker: "background/index.js" },
    content_scripts: [
      { matches: ["<all_urls>"], js: ["content/index.js"] },
    ],
  },
});
```

### 2. ブラウザ別に分割（chromium / firefox）

Chrome と Firefox で異なる設定が必要な場合に使用します。

```ts
// addfox.config.ts
export default defineConfig({
  manifest: {
    chromium: {
      name: "マイ拡張機能",
      version: "1.0.0",
      manifest_version: 3,
      action: { default_popup: "popup/index.html" },
      background: { service_worker: "background/index.js" },
    },
    
    firefox: {
      name: "マイ拡張機能",
      version: "1.0.0",
      manifest_version: 3,
      action: { default_popup: "popup/index.html" },
      background: { service_worker: "background/index.js" },
    },
  },
});
```

### 3. ファイルパス設定

manifest を独立した JSON ファイルに保存します。

```ts
// addfox.config.ts
export default defineConfig({
  manifest: {
    chromium: "manifest/manifest.chromium.json",
    firefox: "manifest/manifest.firefox.json",
  },
});
```

パスは [`appDir`](/ja/config/app-dir) からの相対パスです。

### 4. 自動読み込み（推奨）

`manifest` 設定を書かない場合、フレームワークは自動的に検索します：

1. `appDir/manifest.json`, `appDir/manifest.chromium.json`, `appDir/manifest.firefox.json`
2. `appDir/manifest/manifest.json`, `appDir/manifest/manifest.chromium.json`, `appDir/manifest/manifest.firefox.json`

見つかったファイルはベースとして使用され、同じディレクトリの chromium/firefox ファイルとマージされます。

## Manifest で直接エントリーのソースファイルパスを指定

addfox 1.x から、manifest でエントリーの**ソースファイルパス**を直接指定でき、フレームワークは自動的に認識・ビルドし、パスを成果物パスに置き換えます。

```ts
// addfox.config.ts
export default defineConfig({
  manifest: {
    name: "マイ拡張機能",
    version: "1.0.0",
    manifest_version: 3,
    
    // manifest で直接ソースファイルパスを書く
    background: {
      service_worker: "./background/index.ts",  // ソースファイルパス
    },
    action: {
      default_popup: "./popup/index.tsx",       // ソースファイルパス
    },
    content_scripts: [
      {
        matches: ["<all_urls>"],
        js: ["./content/index.ts"],              // ソースファイルパス
      },
    ],
  },
});
```

フレームワークは以下を行います：
1. これらのソースファイルパス（`.ts`、`.tsx`、`.js`、`.jsx`）を認識
2. 自動的に entry として処理
3. ビルド後にパスを成果物パスに置き換え（例：`background/index.js`）

### サポートされているエントリーフィールド

manifest の以下のフィールドでソースファイルパスを使用できます：

| フィールド | 説明 |
|------|------|
| `background.service_worker` | MV3 バックグラウンドスクリプト |
| `background.scripts` | MV2 バックグラウンドスクリプト |
| `background.page` | バックグラウンドページ |
| `action.default_popup` | MV3 ポップアップページ |
| `browser_action.default_popup` | MV2 ポップアップページ |
| `options_ui.page` / `options_page` | オプションページ |
| `devtools_page` | 開発者ツールページ |
| `side_panel.default_path` | サイドパネル |
| `sandbox.pages` | サンドボックスページ |
| `chrome_url_overrides.newtab` | 新規タブページ |
| `chrome_url_overrides.bookmarks` | ブックマークページ |
| `chrome_url_overrides.history` | 履歴ページ |
| `content_scripts[].js` | Content Script |

### エントリー解決の優先順位

フレームワークがエントリーを解決する優先順位は以下の通りです：

1. **最高**：`config.entry` で明示的に設定したエントリー
2. **第二**：manifest で指定したソースファイルパス
3. **第三**：自動検出（ファイル規約に基づく）

これは以下を意味します：
- `config.entry` でエントリーを指定すると、manifest のソースファイルパスは無視されます
- `config.entry` を設定せず、manifest にソースファイルパスがある場合、フレームワークは manifest のパスを使用します
- どちらもない場合、フレームワークは規約に従って自動的にエントリーを検出します

```ts
// 例：config.entry が最優先
export default defineConfig({
  entry: {
    // この設定が manifest の background ソースファイルパスを上書き
    background: "custom-background/index.ts",
  },
  manifest: {
    background: {
      service_worker: "./background/index.ts",  // config.entry で上書きされる
    },
  },
});
```

## 型定義

```ts
type ManifestConfig = 
  | Record<string, unknown>           // 単一オブジェクト
  | { chromium?: Record<string, unknown>; firefox?: Record<string, unknown> };  // 分割

type ManifestPathConfig = {
  chromium?: string;   // appDir からの相対パス
  firefox?: string;    // appDir からの相対パス
};
```

## 注意事項

1. エントリーパス（例：`popup/index.html`）はフレームワークが [`entry`](/ja/config/entry) と [`outDir`](/ja/config/out-dir) から自動的に計算します
2. CLI `-b chrome|firefox` を使用して、対応するブランチをビルドしてください
3. フレームワークは自動的に `background`、`content_scripts`、`action` などのエントリーパスを manifest に注入します
4. manifest でソースファイルパスを使用する場合、ファイルが存在することを確認してください。存在しない場合、ビルドが失敗します

## 例

### デュアルブラウザサポート

```ts
export default defineConfig({
  manifest: {
    chromium: {
      name: "タブマネージャー",
      version: "1.0.0",
      manifest_version: 3,
      permissions: ["tabs", "storage"],
      action: { default_popup: "popup/index.html" },
      background: { service_worker: "background/index.js" },
      content_scripts: [
        { matches: ["<all_urls>"], js: ["content/index.js"] },
      ],
    },
    
    firefox: {
      name: "タブマネージャー",
      version: "1.0.0",
      manifest_version: 3,
      permissions: ["tabs", "storage"],
      action: { default_popup: "popup/index.html" },
      background: { service_worker: "background/index.js" },
      content_scripts: [
        { matches: ["<all_urls>"], js: ["content/index.js"] },
      ],
    },
  },
});
```

### 純粋な Manifest エントリー設定（config.entry なし）

```ts
export default defineConfig({
  // entry を設定せず、manifest のソースファイルパスに完全に依存
  manifest: {
    name: "純粋Manifest設定例",
    version: "1.0.0",
    manifest_version: 3,
    background: {
      service_worker: "./src/background.ts",
    },
    action: {
      default_popup: "./src/popup.tsx",
    },
    content_scripts: [
      {
        matches: ["<all_urls>"],
        js: ["./src/content.ts"],
      },
    ],
  },
});
```

## 関連設定

- [`entry`](/ja/config/entry) - エントリー設定
- [`appDir`](/ja/config/app-dir) - アプリケーションディレクトリ
- [`outDir`](/ja/config/out-dir) - 出力ディレクトリ
