# hotReload

`hotReload` は開発時のホットリロード動作を設定するために使用されます。

## 概要

- **型**: `{ port?: number; autoRefreshContentPage?: boolean }`
- **デフォルト値**: `{ port: 23333, autoRefreshContentPage: true }`
- **必須**: いいえ

## 使い方

```ts
// addfox.config.ts
import { defineConfig } from "addfox";

export default defineConfig({
  hotReload: {
    port: 23333,                    // WebSocket ポート
    autoRefreshContentPage: false,   // content 変更時にページを自動更新しない
  },
});
```

## 設定項目

### port

- **型**: `number`
- **デフォルト値**: `23333`
- **説明**: WebSocket サーバーポート。開発時に拡張機能と通信するために使用

```ts
export default defineConfig({
  hotReload: {
    port: 3000,  // 3000 ポートを使用
  },
});
```

### autoRefreshContentPage

- **型**: `boolean`
- **デフォルト値**: `true`
- **説明**: content script 変更後に現在のタブページを自動更新するかどうか

```ts
export default defineConfig({
  hotReload: {
    autoRefreshContentPage: false,  // ページを自動更新しない
  },
});
```

## 動作原理

1. `addfox dev` が WebSocket サーバーを起動（デフォルトポート 23333）
2. 拡張機能が WebSocket でサーバーと接続を確立
3. コード変更 → 再ビルド → WebSocket でリロード命令を送信
4. 拡張機能が自動的にリロードし、ページが更新

:::tip Background と Content の違い
- **Background** 変更：拡張機能全体がリロード、Service Worker が再起動
- **Content** 変更：拡張機能リロード + ページへの再注入

:::

## 関連設定

- [guide/hmr](/ja/guide/hmr) - ホットアップデートガイド
