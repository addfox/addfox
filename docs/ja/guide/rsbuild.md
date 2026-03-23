# Rsbuild 設定

Addfox は [Rsbuild](https://rsbuild.dev/) に基づいて構築されており、ビルド設定を完全にカスタマイズできます。

## 設定方法

`addfox.config.ts` で `rsbuild` フィールドを使用：

```ts
// addfox.config.ts
import { defineConfig } from "addfox";

export default defineConfig({
  rsbuild: {
    // あなたの Rsbuild 設定
  },
});
```

## よく使う設定

### パスエイリアス

モジュールインポートパスを簡略化：

```ts
export default defineConfig({
  rsbuild: {
    source: {
      alias: {
        "@": "./app",
        "@/components": "./app/components",
        "@/utils": "./app/utils",
      },
    },
  },
});
```

使用：

```ts
import { Button } from "@/components/Button";
import { formatDate } from "@/utils/date";
```

### グローバル変数の定義

コンパイル時にグローバル定数を注入：

```ts
export default defineConfig({
  rsbuild: {
    source: {
      define: {
        __VERSION__: JSON.stringify(process.env.npm_package_version),
        __DEV__: JSON.stringify(process.env.NODE_ENV === "development"),
      },
    },
  },
});
```

コードで使用：

```ts
console.log(__VERSION__);  // "1.0.0"
console.log(__DEV__);      // true / false
```

### CSS の設定

#### CSS Modules

```ts
export default defineConfig({
  rsbuild: {
    css: {
      modules: {
        localIdentName: "[local]--[hash:base64:5]",
      },
    },
  },
});
```

#### Sass

プラグインをインストール：

```bash
pnpm add -D @rsbuild/plugin-sass sass
```

設定：

```ts
import { pluginSass } from "@rsbuild/plugin-sass";

export default defineConfig({
  plugins: [pluginSass()],
});
```

詳細は [Sass 統合ガイド](/ja/guide/style-integration/sass) を参照。

#### Less

プラグインをインストール：

```bash
pnpm add -D @rsbuild/plugin-less less
```

設定：

```ts
import { pluginLess } from "@rsbuild/plugin-less";

export default defineConfig({
  plugins: [pluginLess()],
});
```

詳細は [Less 統合ガイド](/ja/guide/style-integration/less) を参照。

#### Tailwind CSS

詳細は [Tailwind CSS 統合ガイド](/ja/guide/style-integration/tailwindcss) を参照。

### ビルド最適化

#### コード分割

```ts
export default defineConfig({
  rsbuild: {
    performance: {
      chunkSplit: {
        strategy: "split-by-experience",
      },
    },
  },
});
```

#### リソースインライン化

```ts
export default defineConfig({
  rsbuild: {
    output: {
      dataUriLimit: {
        svg: 4096,      // 4KB 以下の SVG をインライン化
        font: 4096,     // 4KB 以下のフォントをインライン化
      },
    },
  },
});
```

## 関数形式設定

完全な設定制御が必要な場合に使用：

```ts
export default defineConfig({
  rsbuild: (base, helpers) => {
    // base: デフォルト設定
    // helpers.merge: 深いマージツール
    
    return helpers.merge(base, {
      source: {
        alias: {
          "@": "./app",
        },
      },
    });
  },
});
```

## プラグインを追加

```ts
import { pluginReact } from "@rsbuild/plugin-react";
import { pluginSvgr } from "@rsbuild/plugin-svgr";

export default defineConfig({
  plugins: [
    pluginReact(),
    pluginSvgr(),
  ],
});
```

## 完全な例

```ts
import { defineConfig } from "addfox";
import { pluginReact } from "@rsbuild/plugin-react";

export default defineConfig({
  manifest: {
    name: "マイ拡張機能",
    version: "1.0.0",
    manifest_version: 3,
  },
  
  plugins: [pluginReact()],
  
  rsbuild: {
    source: {
      alias: {
        "@": "./app",
        "@/components": "./app/components",
      },
      define: {
        __VERSION__: JSON.stringify("1.0.0"),
      },
    },
    
    output: {
      polyfill: "usage",
    },
    
    performance: {
      chunkSplit: {
        strategy: "split-by-experience",
      },
    },
    
    tools: {
      // カスタムツール設定
    },
  },
});
```

## 注意事項

- 設定は Addfox のデフォルト設定と深くマージされます
- 関数形式は完全に設定を制御できますが、自分でマージを処理する必要があります
- `helpers.merge` を使用してマージすることをお勧めし、デフォルト設定を維持します

## 関連リンク

- [Rsbuild 設定ドキュメント](https://rsbuild.dev/config/)
- [Rsbuild プラグインリスト](https://rsbuild.dev/plugins/list)

## 関連設定

- [`plugins`](/ja/config/plugins) - Rsbuild プラグイン設定
