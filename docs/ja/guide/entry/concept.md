# エントリーコンセプト

**エントリー（Entry）** はブラウザ拡張機能の各機能モジュールに対応し、バックグラウンドスクリプト、Content Script、ポップアップページなどです。Addfox は3つの設定方法を提供し、単独で使用したり、混在して使用したりできます。

## エントリーとは

ブラウザ拡張機能は複数の独立した機能モジュールで構成され、各モジュールにはエントリーファイルが必要です：

| エントリータイプ | 対応するブラウザ拡張機能の概念 | 典型的な用途 |
|----------|-------------------|----------|
| `background` | Service Worker / バックグラウンドスクリプト | 拡張機能のライフサイクル処理、クロスページ通信 |
| `content` | Content Script | ウェブページの DOM 操作、ページとの相互作用 |
| `popup` | ポップアップページ | ツールバーアイコンクリック後のポップアップインターフェース |
| `options` | オプションページ | 拡張機能の設定インターフェース |
| `sidepanel` | サイドパネル | Chrome サイドパネル |
| `devtools` | 開発者ツール | カスタム DevTools パネル |
| `offscreen` | Offscreen ドキュメント | DOM API が必要なバックグラウンドタスク |

**`popup` / `options` / `sidepanel` / `devtools` / `offscreen`** など、HTML が必要なエントリーについて：**カスタム** `index.html` を**提供しない**場合、ビルドは自動的にページを**生成**し、**`<div id="root"></div>`** が含まれます。**`<title>`** は **`manifest.name`** と一致します。**タブアイコン**は **`manifest.icons`** を介して **`<link rel="icon">`** で使用されます。カスタム HTML テンプレートを使用する場合は、自分で title、アイコン、マウントノードを作成する必要があります（詳細は [ファイルベースのエントリー](/ja/guide/entry/file-based) を参照）。

## 設定方法

### 方法1：ファイルベース（推奨）

**`entry` を設定せず**、フレームワークがディレクトリとファイル名に従って自動的にエントリーを検出します。

```tree
app/
├── background/
│   └── index.ts      # → background エントリー
├── content/
│   └── index.ts      # → content エントリー
├── popup/
│   └── index.ts      # → popup エントリー
└── ...
```

利点：
- ゼロ設定、規約に従うだけ
- 新しいエントリーを追加するには、対応するディレクトリを作成するだけ
- コード構造が明確

詳細は [ファイルベースのエントリー](/ja/guide/entry/file-based) を参照。

### 方法2：設定ベース（entry + manifest）

`addfox.config.ts` で `entry` と `manifest` を使用してエントリー関連の機能を共同で設定します：

```ts
export default defineConfig({
  entry: {
    background: "background/index.ts",
    content: "content/index.ts",
    popup: "popup/index.ts",
  },
  manifest: {
    manifest_version: 3,
    action: { default_popup: "popup/index.html" },
  },
});
```

利点：
- エントリーとマニフェスト設定の集中管理
- カスタムエントリー名をサポート
- 自動検出結果を上書き可能

詳細は [設定ベースのエントリー](/ja/guide/entry/config-based) と [manifest 設定](/ja/config/manifest) を参照。

### 混在して使用

3つの方法は混在して使用でき、優先順位は以下の通りです：

1. **最高**：`config.entry` で設定したエントリー
2. **第二**：manifest で指定したソースファイルパス
3. **第三**：自動検出

```ts
export default defineConfig({
  entry: {
    // 最高優先度：他のすべての設定を上書き
    popup: "pages/popup/main.ts",
  },
  manifest: {
    // 第二優先度：entry が指定されていない場合に使用
    background: { service_worker: "./background/index.ts" },
    // popup は entry の設定を使用し、ここではない
    action: { default_popup: "./popup/index.ts" },
  },
  // 第三優先度：設定されていないエントリーを自動検出
});
```

## コア原則

### エントリーは JS/TS である必要がある

Addfox は **Rsbuild** に基づいて構築されるため、実際のビルドエントリーは `.js`、`.jsx`、`.ts`、`.tsx` スクリプトファイルのみです。

### HTML の処理

- **HTML が不要なエントリー**：`background`、`content` はスクリプトファイルのみ必要
- **HTML が必要なエントリー**：`popup`、`options`、`sidepanel`、`devtools`、`offscreen`
  - HTML を提供しない場合、Rsbuild が自動的に生成します（`<div id="root"></div>` を含む）
  - カスタム HTML テンプレートを提供する場合は、テンプレートで `data-addfox-entry` を介してエントリースクリプトを指定する必要があります

### 例：カスタム HTML テンプレート

```html
<!-- app/popup/index.html -->
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>ポップアップ</title>
  </head>
  <body>
    <div id="root"></div>
    <!-- data-addfox-entry を介してエントリーを指定 -->
    <script type="module" data-addfox-entry src="./index.ts"></script>
  </body>
</html>
```

## 組み込みエントリーとカスタムエントリー

### 組み込みエントリー（予約名）

以下の名前は特殊な意味を持ち、Addfox は自動的に認識して処理します：

| エントリー名 | 説明 |
|--------|------|
| `background` | Service Worker（MV3）またはバックグラウンドページ（MV2） |
| `content` | Content Script |
| `popup` | ツールバーポップアップ |
| `options` | 拡張機能オプションページ |
| `sidepanel` | サイドパネル |
| `devtools` | 開発者ツール |
| `offscreen` | Offscreen ドキュメント |

:::warning
組み込みエントリー名は変更できません。フレームワークはこれらの名前に依存して自動認識と manifest パス埋め込みを行います。
:::

### カスタムエントリー

組み込みエントリーに加えて、`entry` で任意の名前を**カスタムエントリー**として設定できます（例：`capture`、`my-page`）：

```ts
export default defineConfig({
  entry: {
    capture: { src: "capture/index.ts", html: true },
  },
});
```

カスタムエントリーは独立したページを出力し、`chrome-extension://<id>/capture/index.html` でアクセスできます。

## 次のステップ

- [ファイルベースのエントリー](/ja/guide/entry/file-based) — 規約型エントリー検出ルールを学ぶ
- [設定ベースのエントリー](/ja/guide/entry/config-based) — entry + manifest の明示的設定を理解する
- [manifest 設定](/ja/config/manifest) — manifest で拡張機能の機能を設定する
