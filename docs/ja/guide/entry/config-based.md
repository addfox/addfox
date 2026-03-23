# 設定ベースのエントリー

`addfox.config.ts` で `entry` と `manifest` を使用して設定駆動を行う場合：
- カスタムエントリーパス
- 自動検出結果の上書き
- **カスタムエントリー**の追加（例：`capture`、`my-page` など）

`entry` にリストされていないエントリーは、[ファイルベースのルール](/ja/guide/entry/file-based)によって自動的に検出されたままになります。

## コア原則

ファイルベースのエントリーと同様：
- **エントリーは JS/TS である必要がある**：Rsbuild に基づくビルドのため、実際のエントリーはスクリプトファイルのみ
- **HTML の処理**：組み込み HTML エントリー（popup/options など）は自動生成。カスタム HTML テンプレートを使用する場合は、`data-addfox-entry` を介してエントリースクリプトを指定する必要がある
- **HTML を自動生成する場合**（カスタムテンプレートなし）：ページには **`<div id="root"></div>`** が含まれます。**`<title>`** は **`manifest.name`** を使用します。**favicon** は **`<link rel="icon">`** を介して **`manifest.icons`** のパスを使用します。カスタム `index.html` を使用する場合、これら2つは自動的に注入されず、自分で作成する必要があります。

## 設定の書き方

### 1) `entry` でエントリーを設定

`entry` はオブジェクトです：**キー = エントリー名、値 = パスまたは設定オブジェクト**。

### 2) `manifest` でエントリー関連フィールドを設定

`manifest` でエントリー関連の機能フィールド（例：`background`、`action.default_popup`、`content_scripts`）を宣言できます：

```ts
export default defineConfig({
  manifest: {
    manifest_version: 3,
    background: { service_worker: "background/index.js" },
    action: { default_popup: "popup/index.html" },
    content_scripts: [
      { matches: ["<all_urls>"], js: ["content/index.js"] },
    ],
  },
});
```

### 3) `entry` と `manifest` の優先順位

両方がエントリー解決に関与する場合、優先順位は以下の通りです：

1. `entry` で明示的に設定
2. `manifest` でのエントリー関連フィールド
3. 自動検出（ファイルベース）

つまり：`entry` は同名エントリーの他のソースを上書きします。

### 文字列パス（推奨）

値は **baseDir** からの相対パスです（デフォルト `app/`）：

| 値の型 | 意味 | 例 |
|--------|------|------|
| スクリプトパス `.ts/.tsx` | そのスクリプトをエントリーとして使用。組み込み HTML エントリーは自動的に HTML を生成するか、同じディレクトリの `index.html` をテンプレートとして使用 | `"popup/index.ts"` |
| HTML パス `.html` | その HTML をテンプレートとして使用。`data-addfox-entry` を介してエントリースクリプトを解析する必要がある | `"popup/index.html"` |

### オブジェクト形式：`{ src, html? }`

より細かい制御：

| フィールド | 型 | 説明 |
|------|------|------|
| `src` | `string` | エントリースクリプトパス（baseDir からの相対パス）**必須** |
| `html` | `boolean \| string` | `true`：テンプレートなしで HTML を生成。`false`：スクリプトのみ。`string`：HTML テンプレートパスを指定 |

## 組み込みエントリーと出力パス

`entry` を使用して組み込みエントリーを設定する場合、デフォルトの出力パスは以下の通りです：

| エントリー名 | 型 | 出力スクリプト | 出力 HTML |
|--------|------|----------|-----------|
| `background` | スクリプトのみ | `background/index.js` | — |
| `content` | スクリプトのみ | `content/index.js` | — |
| `popup` | スクリプト+HTML | `popup/index.js` | `popup/index.html` |
| `options` | スクリプト+HTML | `options/index.js` | `options/index.html` |
| `sidepanel` | スクリプト+HTML | `sidepanel/index.js` | `sidepanel/index.html` |
| `devtools` | スクリプト+HTML | `devtools/index.js` | `devtools/index.html` |
| `offscreen` | スクリプト+HTML | `offscreen/index.js` | `offscreen/index.html` |

:::info
manifest では、フレームワークは上記のパスを使用して `action.default_popup`、`options_page` などのフィールドを自動的に埋め込みます。
:::

## 設定例

### 一部のエントリーを上書き

```ts
// addfox.config.ts
import { defineConfig } from "addfox";

export default defineConfig({
  entry: {
    // これらのエントリーのみを上書き、他は自動検出されたまま
    popup: "popup/main.tsx",
    options: "options/settings.tsx",
  },
});
```

### すべてのエントリーを完全に設定

```ts
export default defineConfig({
  appDir: "src",
  entry: {
    background: "background/index.ts",
    content: "content/index.ts",
    popup: "popup/index.tsx",
    options: "options/index.tsx",
    sidepanel: "sidepanel/index.tsx",
  },
});
```

### カスタムエントリー + 強制的に HTML を生成

```ts
export default defineConfig({
  entry: {
    // 組み込みエントリー
    background: "background/index.ts",
    content: "content/index.ts",
    popup: "popup/index.tsx",
    
    // カスタムページエントリー（自動的に HTML を生成）
    capture: { src: "pages/capture/index.tsx", html: true },
    
    // カスタムページエントリー（テンプレートを使用）
    welcome: { src: "pages/welcome/index.tsx", html: "pages/welcome/template.html" },
    
    // スクリプトのみのエントリー（HTML なし）
    worker: { src: "worker/index.ts", html: false },
  },
});
```

### エントリー自動検出を無効にする

すべてのエントリーを完全に手動で制御する必要がある場合：

```ts
export default defineConfig({
  entry: {
    background: "background/index.ts",
    content: "content/index.ts",
    popup: "popup/index.tsx",
    // ... 必要なすべてのエントリーを一覧表示
  },
  // 不要な設定項目は未定義のままにし、フレームワークは entry に一覧表示されたエントリーのみを処理します
});
```

## パス解決ルール

### baseDir からの相対パス

`entry` のすべてのパスは **baseDir からの相対パス**であり、baseDir は [`appDir`](/ja/config/app-dir) によって決定されます（デフォルト `app`）：

```ts
export default defineConfig({
  appDir: "src",                    // baseDir = src/
  entry: {
    popup: "popup/index.ts",        // src/popup/index.ts を指す
  },
});
```

### パス早見表

| 設定の書き方 | エントリースクリプトの位置 | 典型的な出力 |
|----------|--------------|----------|
| `background: "background/index.ts"` | `app/background/index.ts` | `extension/background/index.js` |
| `content: "content.ts"` | `app/content.ts` | `extension/content.js` |
| `popup: "popup/index.ts"` | `app/popup/index.ts` | `extension/popup/index.html` + `extension/popup/index.js` |
| `capture: { src: "capture/index.ts", html: true }` | `app/capture/index.ts` | `extension/capture/index.html` + `extension/capture/index.js` |

## 次のステップ

- [ファイルベースのエントリー](/ja/guide/entry/file-based) — 自動検出ルールを理解する
- [appDir 設定](/ja/config/app-dir) — ソースコードディレクトリを変更する
- [manifest 設定](/ja/config/manifest) — 拡張機能マニフェストを設定する
