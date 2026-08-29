# CLI

このページでは `addfox` CLI がサポートするコマンドとパラメータをまとめます。

## 基本使用方法

```bash
addfox <command> [options]
```

## package.json での scripts 設定

```json
{
  "scripts": {
    "dev": "addfox dev",
    "dev:firefox": "addfox dev -b firefox",
    "build": "addfox build",
    "build:chrome": "addfox build -b chrome",
    "test": "addfox test"
  }
}
```

## コマンド

| コマンド | 説明 |
|------|------|
| `dev` | 開発モードを開始（ホットアップデートをサポート）。 |
| `build` | 本番ビルドを実行。 |
| `test` | テストを実行（パラメータは rstest に透過されます）。 |

> `addfox test` は `rstest.config.*` または `addfox.config` の [`test`](/config/test) フィールドから設定を読み込みます。両方が存在する場合は `rstest.config.*` が優先されます。

## よく使うパラメータ（デフォルト値 + 設定マッピング）

| パラメータ | 組み込みデフォルト | 対応 `addfox.config` フィールド | 説明 |
|------|------------|---------------------------|------|
| `-b, --browser <browser>` | `chromium` | 直接対応するフィールドなし（ターゲットと起動に影響） | ターゲット/起動ブラウザを指定。詳細は以下の[サポートされているブラウザリスト](#サポートされているブラウザリスト)を参照。 |
| `--keep-browser-profile` | `false` | `keepBrowserProfile` | 起動間でブラウザ profile を保持する(デフォルト: 毎回新規 profile を使用)。 |
| `--no-keep-browser-profile` | `false`（現在のコマンドのみ） | `keepBrowserProfile` | 今回の実行では新規ブラウザ profile を使用する。 |
| `-r, --report` | `false` | `report` | Rsdoctor ビルド分析レポートを有効にする。 |
| `--no-open` | `false`（つまりデフォルトで自動で開く） | 直接対応するフィールドなし | ビルドまたは開発時にブラウザを自動で開かない。 |
| `--debug` | `false` | `debug` | デバッグモードを有効にする（開発時のエラー監視などの機能）。 |
| `--help` | - | - | ヘルプを表示。 |
| `--version` | - | - | バージョン番号を表示。 |

> `-c, --cache` と `--no-cache` は `--keep-browser-profile` / `--no-keep-browser-profile` の非推奨（deprecated）エイリアスです。引き続き使用できますが、ターミナルに非推奨の警告が表示されます。

## サポートされているブラウザリスト

`-b, --browser` パラメータは以下のブラウザをサポートしています：

| ブラウザ | 説明 |
|--------|------|
| `chromium` | Chromium（デフォルト） |
| `chrome` | Google Chrome |
| `edge` | Microsoft Edge |
| `brave` | Brave Browser |
| `vivaldi` | Vivaldi |
| `opera` | Opera |
| `santa` | Santa Browser |
| `arc` | Arc Browser |
| `yandex` | Yandex Browser |
| `browseros` | BrowserOS |
| `custom` | カスタムブラウザ（設定で `browser.custom` を指定する必要がある） |
| `firefox` | Mozilla Firefox |

## 例

```bash
# Chromium 開発モード
addfox dev -b chromium

# Firefox 開発 + デバッグ
addfox dev -b firefox --debug

# 本番ビルド
addfox build -b chrome

# ビルドするがブラウザを自動で開かない
addfox build -b chrome --no-open

# ビルド分析レポートを生成
addfox build -r
```

## 説明

- `--debug` は主に `dev` モードで作用します。
- デフォルトでは毎回新規 profile で起動します。ログイン状態などを保持したい場合は `--keep-browser-profile` を使うか、設定ファイルで `keepBrowserProfile: true` を指定してください（`browser.<name>.keepBrowserProfile` でブラウザごとに上書きも可能です）。
- `-b/--browser` は個別の config フィールドがなく、コマンドレベルの選択です。
