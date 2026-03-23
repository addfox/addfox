# ホットアップデート（HMR）

`addfox dev` コマンドは開発時のホットアップデート体験を提供します：コードを保存した後、自動的に再ビルドされ、WebSocket を介してブラウザ拡張機能にリロード通知が送信されます。

## 動作メカニズム

```
ソースコード変更
    ↓
Rsbuild Watch 再ビルド
    ↓
ビルド完了 → WebSocket 通知
    ↓
ブラウザ拡張機能リロード
    ↓
ページ自動更新
```

## 異なるエントリーのホットアップデートメカニズム

### Background / Service Worker

Background スクリプトは**拡張機能リロード**メカニズムを使用します：

1. コード変更 → Rsbuild 再ビルド
2. ビルド完了 → WebSocket でリロード命令を送信
3. `chrome.runtime.reload()` を呼び出して拡張機能全体をリロード
4. Service Worker が再起動し、新しいコードを読み込む

:::warning 状態の損失
Service Worker のリロード後、メモリ内の状態は失われます。データを永続化する必要がある場合は、`chrome.storage` API を使用してください。
:::

### Content Script

Content Script は**再注入**メカニズムを使用します：

1. コード変更 → Rsbuild 再ビルド
2. ビルド完了 → 拡張機能リロード
3. Content Script が一致するページに自動的に注入
4. 開いているタブページは自動的に更新されるように選択可能（設定を参照）

```ts
// addfox.config.ts
export default defineConfig({
  hotReload: {
    autoRefreshContentPage: true,  // content 変更時にページを自動更新、デフォルト true
  },
});
```

:::tip Background との違い
Content Script はウェブページ環境で実行され、リロード後は一致するページに再注入されるため、拡張機能管理ページを手動で更新する必要はありません。
:::

### Popup / Options / Sidepanel

ページクラスのエントリーは **Rsbuild HMR** メカニズムを使用します：

1. コード変更 → Rsbuild が HMR ホット置換を試みる
2. HMR が成功した場合 → ページが部分的に更新され、状態が保持される
3. HMR が失敗した場合 → 自動的にページ更新にフォールバック

:::tip HMR の利点
- より速い更新速度
- コンポーネント状態の保持（例：フォーム入力）
- よりスムーズな開発体験

:::

:::warning HTML テンプレートの制限
Rsbuild のメカニズムの影響を受け、HTML テンプレートファイル（例：`popup/index.html`）は真の HMR ホット置換をサポートしていません。  
HTML テンプレートを変更すると、Addfox はページ更新または拡張機能リロードにフォールバックします。
:::

## Firefox の特殊な処理

Firefox 開発モードでは **web-ext** ツールを使用して拡張機能を管理します：

- 拡張機能のリロードは `web-ext` によって処理され、Addfox の WebSocket ではありません
- 初回起動時に自動的に Firefox を開き、拡張機能を読み込みます
- 自動リロード（livereload）をサポート

:::info
Firefox で開発する場合は、Firefox ブラウザがインストールされていることを確認してください。Addfox は自動的に `web-ext` を呼び出して、Firefox の拡張機能読み込みとリロードを処理します。
:::

## 使用方法

```bash
# 開発サーバーを起動（HMR を自動的に有効にする）
addfox dev

# ターゲットブラウザを指定
addfox dev -b chrome
addfox dev -b firefox
```

## 初回起動フロー

`addfox dev` を実行した後：

1. 初回ビルド完了
2. 設定に基づいて自動的にブラウザを起動
3. 開発中の拡張機能を読み込む
4. 拡張機能の popup/options ページを自動的に開く（`open` が設定されている場合）

## 設定オプション

### ホットリロードポート

```ts
// addfox.config.ts
export default defineConfig({
  hotReload: {
    port: 23333,              // WebSocket ポート、デフォルト 23333
    autoRefreshContentPage: true,  // content 変更時にページを自動更新、デフォルト true
  },
});
```

## 次のステップ

- [browserPath 設定](/ja/guide/launch) — 開発時に自動的にブラウザを開く設定
- [monitor デバッグ](/ja/guide/monitor) — エラーモニタリングパネルを使用したデバッグ
- [config/hot-reload](/ja/config/hot-reload) — ホットリロードの完全な設定オプション
