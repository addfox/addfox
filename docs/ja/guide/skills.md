---
name: addfox-skills
description: Addfox インストール可能な Skill ライブラリドキュメント。このページは c:/programs/skills の現在の内容と一致しており、インストールコマンド、スキルリスト、ディレクトリ構造を含みます。
---

# Skills

このページの内容は `c:/programs/skills` の現在のリポジトリと一致しています。

このリポジトリはインストール可能な Addfox 拡張機能開発 Skills を提供します。

## 追加と使用

プロジェクトルートで実行：

```bash
# このリポジトリのすべての skills をインストール
npx skills add addmo-dev/skills

# 指定した skills のみをインストール
npx skills add addmo-dev/skills --skill migrate-to-addfox
npx skills add addmo-dev/skills --skill addfox-best-practices
npx skills add addmo-dev/skills --skill extension-functions-best-practices
npx skills add addmo-dev/skills --skill addfox-debugging
npx skills add addmo-dev/skills --skill addfox-testing

# 最初に利用可能な skills を一覧表示
npx skills add addmo-dev/skills --list
```

完全な GitHub URL も使用可能：

```bash
npx skills add https://github.com/addmo-dev/skills
```

## Skills リスト

| Skill | 用途 |
|-------|------|
| **migrate-to-addfox** | 既存プロジェクトを WXT、Plasmo、Extension.js、またはフレームワークなしのソリューションから Addfox に移行します。 |
| **addfox-best-practices** | Addfox プロジェクトのベストプラクティス：エントリー、設定、manifest、権限、クロスブラウザ、フレームワークスタイル、メッセージ通信など。 |
| **extension-functions-best-practices** | 拡張機能の実装ガイド：ビデオ/オーディオ/画像/ダウンロード/AI/翻訳/パスワード管理/Web3 などの機能シナリオ。 |
| **addfox-debugging** | Addfox ビルドと実行時の問題のトラブルシューティング：ターミナル、`.addfox/error.md`、`.addfox/meta.md` を組み合わせて特定。 |
| **addfox-testing** | Addfox テストの実践：ユニットテストと E2E テストの選択、設定、実装方法。 |

## リポジトリ構造

```tree
skills/
├── migrate-to-addfox/
│   ├── SKILL.md
│   └── references/
├── addfox-best-practices/
│   ├── SKILL.md
│   ├── reference.md
│   └── rules/
├── extension-functions-best-practices/
│   ├── SKILL.md
│   └── reference.md
├── addfox-debugging/
│   ├── SKILL.md
│   └── reference.md
└── addfox-testing/
    ├── SKILL.md
    └── reference.md
```

## 説明

- Skills は `skills CLI` を介してインストールされた後、プロジェクトのスキルディレクトリ（例：`.cursor/skills/` または `.agents/skills/`）にコピーされます。
- まず全量をインストールし、チームのニーズに応じてよく使用するスキルを保持できます。
