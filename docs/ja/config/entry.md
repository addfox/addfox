# entry

`entry` は拡張機能のエントリーマッピングをカスタマイズするために使用されます。設定しない場合、フレームワークは自動的にアプリケーションディレクトリからエントリーを検出します。

## 概要

- **型**: `Record<string, EntryConfigValue> | undefined`
- **デフォルト値**: `undefined`（自動検出）
- **必須**: いいえ

```ts
type EntryConfigValue = 
  | string                           // スクリプトパス
  | { src: string; html?: boolean | string };  // オブジェクト形式
```

## 予約エントリー名

以下の名前は特殊な意味を持ち、ブラウザ拡張機能の標準エントリーに対応します：

| エントリー名 | 型 | 説明 |
|--------|------|------|
| `background` | スクリプトのみ | Service Worker / バックグラウンドスクリプト |
| `content` | スクリプトのみ | Content Script |
| `popup` | スクリプト + HTML | ポップアップページ |
| `options` | スクリプト + HTML | オプションページ |
| `sidepanel` | スクリプト + HTML | サイドパネル |
| `devtools` | スクリプト + HTML | 開発者ツールページ |
| `offscreen` | スクリプト + HTML | Offscreen ドキュメント |

## 設定方法

### 文字列形式

値は baseDir（デフォルト `app/`）からの相対スクリプトパスです。

```ts
export default defineConfig({
  entry: {
    background: "background/index.ts",
    content: "content/index.ts",
    popup: "popup/index.tsx",
  },
});
```

### オブジェクト形式

より細かい制御が可能です：

```ts
export default defineConfig({
  entry: {
    // HTML を自動生成
    popup: { src: "popup/index.tsx", html: true },
    
    // カスタム HTML テンプレートを使用
    options: { src: "options/index.tsx", html: "options/template.html" },
    
    // スクリプトのみ（HTML を生成しない）
    worker: { src: "worker/index.ts", html: false },
  },
});
```

### カスタムエントリー

予約名以外に、任意の名前をカスタムページエントリーとして追加できます：

```ts
export default defineConfig({
  entry: {
    // 組み込みエントリー
    background: "background/index.ts",
    popup: "popup/index.tsx",
    
    // カスタムエントリー
    capture: { src: "pages/capture/index.tsx", html: true },
    welcome: { src: "pages/welcome/index.tsx", html: true },
  },
});
```

カスタムエントリーは独立したページを出力し、`chrome-extension://<id>/capture/index.html` でアクセスできます。

## パスルール

- すべてのパスは **baseDir からの相対パス**です（[`appDir`](/ja/config/app-dir) によって決定され、デフォルトは `app/`）
- エントリーは `.js`、`.jsx`、`.ts`、`.tsx` スクリプトである必要があります
- カスタム HTML テンプレートを使用する場合は、`data-addfox-entry` でエントリースクリプトを指定する必要があります

## 自動検出との関係

- `entry` を設定した場合：`entry` で宣言されたエントリーのみ使用
- `entry` を設定しない場合：`app/` ディレクトリから自動的にエントリーを検出
- 混在して使用：`entry` で設定したエントリーが自動検出の同名エントリーを上書き

## 例

### 一部のエントリーを上書き

```ts
export default defineConfig({
  entry: {
    // popup のパスを上書き
    popup: "pages/popup/main.tsx",
    // background と content は自動検出されたまま
  },
});
```

### 完全な設定

```ts
export default defineConfig({
  appDir: "src",
  entry: {
    background: "background/index.ts",
    content: "content/index.ts",
    popup: { src: "popup/index.tsx", html: true },
    options: { src: "options/index.tsx", html: "options/index.html" },
    capture: { src: "capture/index.tsx", html: true },
  },
});
```

## 関連設定

- [`appDir`](/ja/config/app-dir) - アプリケーションディレクトリ
- [guide/entry/concept](/ja/guide/entry/concept) - エントリーコンセプトの詳細
- [guide/entry/file-based](/ja/guide/entry/file-based) - ファイルベースのエントリー検出
- [guide/entry/config-based](/ja/guide/entry/config-based) - 設定ベースのエントリー
