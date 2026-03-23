# Manifest 設定

`manifest` はブラウザ拡張機能のマニフェスト（Manifest）を宣言するために使用されます。つまり、最終出力ディレクトリの `manifest.json` の内容です。

3つの設定方法をサポートします：
- **インラインオブジェクト**：設定に直接 manifest の内容を記述
- **ブラウザ別に分割**：Chrome と Firefox の manifest を別々に設定
- **ファイルパス**：manifest ファイルの位置を指定

**完全に省略**することもでき、フレームワークはソースコードディレクトリから自動的に読み込みます。

## 型とデフォルトの動作

- **型**: `ManifestConfig | ManifestPathConfig | undefined`
- **デフォルトの動作**：設定しない場合、フレームワークは `appDir` またはそのサブディレクトリ `manifest/` から自動的に検索します：
  - `manifest.json` — 基本設定（単一ブラウザまたは共通部分）
  - `manifest.chromium.json` — Chrome 上書き設定
  - `manifest.firefox.json` — Firefox 上書き設定

ビルド時に、フレームワークは CLI で指定されたターゲットブラウザ（`-b chrome|firefox`）に基づいてマージし、`outputRoot/outDir/manifest.json` に出力します。

## 設定方法

### 1. 単一オブジェクト（単一ブラウザまたは共通設定）

すべてのフィールドを1つのオブジェクトに記述し、フレームワークは自動的にエントリーパスを注入します。

```ts
// addfox.config.ts
import { defineConfig } from "addfox";

export default defineConfig({
  manifest: {
    name: "マイ拡張機能",
    version: "1.0.0",
    manifest_version: 3,
    permissions: ["storage", "activeTab"],
  },
});
```

フレームワークはエントリー設定に基づいてパスを自動的に生成・注入します：
- `action.default_popup` → `popup/index.html`
- `background.service_worker` → `background/index.js`
- `content_scripts` → `content/index.js`

> エントリーパス（例：`popup/index.html`）はフレームワークが [entry](/ja/guide/entry/file-based) と [outDir](/ja/config/out-dir) から自動的に計算します。manifest のフィールドの意味を正しく保つだけです。

### 2. ブラウザ別に分割（chromium / firefox）

Chrome と Firefox で異なる manifest 設定が必要な場合：

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
      permissions: ["storage"],
    },
    firefox: {
      name: "マイ拡張機能",
      version: "1.0.0",
      manifest_version: 3,
      action: { default_popup: "popup/index.html" },
      background: { service_worker: "background/index.js" },
      permissions: ["storage"],
    },
  },
});
```

ビルド時に CLI パラメータに基づいて対応するブランチを選択します：
- `addfox dev -b chrome` → `chromium` ブランチを使用
- `addfox dev -b firefox` → `firefox` ブランチを使用

### 3. パス設定（appDir からの相対パス）

manifest を独立した JSON ファイルに保存：

```ts
// addfox.config.ts
export default defineConfig({
  manifest: {
    chromium: "manifest/manifest.chromium.json",
    firefox: "manifest/manifest.firefox.json",
  },
});
```

ファイルパスは [`appDir`](/ja/config/app-dir) からの相対パスです。

### 4. 完全に省略（自動読み込み）

`manifest` 設定を書かない場合、フレームワークは以下の順序で検索します：

1. `appDir/manifest.json`
2. `appDir/manifest/manifest.json`
3. `appDir/manifest/manifest.chromium.json`
4. `appDir/manifest/manifest.firefox.json`

**推奨されるファイル構造**：

```
app/
├── manifest/
│   ├── manifest.json           # 基本設定
│   ├── manifest.chromium.json  # Chrome 上書き
│   └── manifest.firefox.json   # Firefox 上書き
├── background/
├── content/
└── popup/
```

## 完全な例

### デュアルブラウザサポート設定

```ts
// addfox.config.ts
import { defineConfig } from "addfox";

export default defineConfig({
  manifest: {
    chromium: {
      name: "タブマネージャー",
      version: "1.0.0",
      description: "ブラウザタブを効率的に管理",
      manifest_version: 3,
      permissions: ["tabs", "storage"],
      icons: {
        16: "icons/icon16.png",
        48: "icons/icon48.png",
        128: "icons/icon128.png",
      },
      action: {
        default_popup: "popup/index.html",
        default_icon: {
          16: "icons/icon16.png",
        },
      },
      background: {
        service_worker: "background/index.js",
      },
      content_scripts: [
        {
          matches: ["<all_urls>"],
          js: ["content/index.js"],
          run_at: "document_end",
        },
      ],
    },
    
    firefox: {
      name: "タブマネージャー",
      version: "1.0.0",
      description: "ブラウザタブを効率的に管理",
      manifest_version: 3,
      permissions: ["tabs", "storage"],
      icons: {
        16: "icons/icon16.png",
        48: "icons/icon48.png",
        128: "icons/icon128.png",
      },
      action: {
        default_popup: "popup/index.html",
        default_icon: {
          16: "icons/icon16.png",
        },
      },
      background: {
        service_worker: "background/index.js",
      },
      content_scripts: [
        {
          matches: ["<all_urls>"],
          js: ["content/index.js"],
          run_at: "document_end",
        },
      ],
    },
  },
});
```

## 関連設定

- [entry](/ja/guide/entry/file-based) — エントリー検出ルール
- [appDir](/ja/config/app-dir) — アプリケーションディレクトリ設定
- [outDir](/ja/config/out-dir) — 出力ディレクトリ設定
