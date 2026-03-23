# アイコン

ブラウザ拡張機能には、ツールバー、拡張機能管理ページ、Web Store で使用する一連のアイコンが必要です。

## アイコンサイズ

Chrome 拡張機能で推奨されるサイズ：

| サイズ | 用途 |
|------|------|
| 16x16 | ツールバーアイコン（Favicon） |
| 32x32 | ツールバーアイコン（Retina） |
| 48x48 | 拡張機能管理ページ |
| 128x128 | Web Store とインストールプロンプト |

Firefox での追加サポート：

| サイズ | 用途 |
|------|------|
| 19x19 | ツールバーアイコン |
| 38x38 | ツールバーアイコン（Retina） |
| 96x96 | 拡張機能管理ページ |

## ディレクトリ構造

アイコンを `public/icons/` に配置：

```tree
public/
└── icons/
    ├── icon16.png
    ├── icon32.png
    ├── icon48.png
    └── icon128.png
```

## Manifest での設定

```json
{
  "icons": {
    "16": "icons/icon16.png",
    "32": "icons/icon32.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  },
  "action": {
    "default_icon": {
      "16": "icons/icon16.png",
      "32": "icons/icon32.png"
    }
  }
}
```

## アイコンを動的に設定

コードでアイコンを変更できます：

```ts
// ツールバーアイコンを設定
chrome.action.setIcon({
  path: {
    16: "icons/icon-active16.png",
    32: "icons/icon-active32.png",
  },
});

// タイトルを設定
chrome.action.setTitle({ title: "Active Mode" });

// バッジを設定
chrome.action.setBadgeText({ text: "3" });
chrome.action.setBadgeBackgroundColor({ color: "#FF0000" });
```

## ダークモード対応

異なるテーマに異なるアイコンを提供：

```ts
// システムテーマを検出して対応するアイコンを設定
if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
  chrome.action.setIcon({
    path: {
      16: "icons/icon-dark16.png",
      32: "icons/icon-dark32.png",
    },
  });
}
```

## アイコンのデザイン提案

1. **シンプルで明確** — 小さなサイズでも識別可能
2. **ブランド一貫性** — 拡張機能の機能またはブランドに関連
3. **高いコントラスト** — 異なる背景でも明確に見える
4. **テキストを避ける** — 小さなサイズではテキストが識別しにくい
5. **PNG を使用** — 透過背景をサポート

## SVG アイコン

Chrome は SVG アイコンもサポートしています：

```json
{
  "icons": {
    "16": "icons/icon16.svg",
    "32": "icons/icon32.svg"
  }
}
```

ただし、一部のシナリオ（例：Web Store）では PNG が依然として必要なため、両方を提供することをお勧めします。

## アイコン生成ツール

- [Figma](https://figma.com/) — アイコンをデザインして複数サイズにエクスポート
- [Icon Kitchen](https://icon.kitchen/) — オンラインで拡張機能アイコンを生成
- [RealFaviconGenerator](https://realfavicongenerator.net/) — 複数サイズのアイコンを生成

## 完全な例

```ts
// addfox.config.ts
export default defineConfig({
  manifest: {
    name: "マイ拡張機能",
    icons: {
      16: "icons/icon16.png",
      32: "icons/icon32.png",
      48: "icons/icon48.png",
      128: "icons/icon128.png",
    },
    action: {
      default_icon: {
        16: "icons/icon16.png",
        32: "icons/icon32.png",
      },
    },
  },
});
```

## 関連リンク

- [Chrome アイコン仕様](https://developer.chrome.com/docs/extensions/mv3/user_interface/#icons)
- [Chrome Web Store アイコン要件](https://developer.chrome.com/docs/webstore/images/#icons)
