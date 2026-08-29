# キャッシュ

Addfox は開発を高速化するために、プロジェクト内に `.addfox/cache` ディレクトリを生成します。

## `.addfox/cache` の内容

- **`cache/build/`** — Rspack の永続ビルドキャッシュ。デフォルトで有効で、再ビルドや dev の再起動を高速化します。[`buildCache`](/ja/config/cache) で設定できます。
- **`cache/browser-profile/`** — Chromium のユーザーデータ(profile)ディレクトリ。デフォルトでは `addfox dev` は毎回**新しい profile** で起動します。[`keepBrowserProfile`](/ja/config/cache)（トップレベル設定、ブラウザごとの上書き、または CLI の `--keep-browser-profile` フラグ）を有効にした場合のみ、profile が起動間で保持されます。

実際のファイルはプラットフォームやモードによって異なる場合がありますが、目的は同じです：**繰り返しのコールド初期化を回避**することです。

## 効果

- **より速い再ビルド**：永続ビルドキャッシュにより、変更されていないモジュールの再コンパイルがスキップされます。
- **オプションの profile 永続化**：`keepBrowserProfile` を有効にすると、拡張機能のインストール状態、設定、ログインセッションが `addfox dev` の起動間で保持されます。

## キャッシュをクリアするタイミング

以下の状況では `.addfox/cache` をクリアしてください：

- ブラウザ profile の動作が異常
- 拡張機能の読み込み状態に不整合がある
- クリーンな状態でのデバッグ環境が必要

このディレクトリは安全に削除できます。Addfox は次回実行時に再生成します。

## 関連設定

- [`keepBrowserProfile` / `buildCache`](/ja/config/cache) - キャッシュ設定
