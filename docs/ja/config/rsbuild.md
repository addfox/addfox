# rsbuild

`rsbuild` は Rsbuild 設定をカスタマイズまたは拡張するために使用されます。

## 概要

- **型**: `RsbuildConfig | ((base: RsbuildConfig, helpers: RsbuildConfigHelpers) => RsbuildConfig | Promise<RsbuildConfig>)`
- **デフォルト値**: `undefined`
- **必須**: いいえ

## 設定方法

### オブジェクト形式（深いマージ）

設定オブジェクトはデフォルト設定と深くマージされます：

```ts
// addfox.config.ts
import { defineConfig } from "addfox";

export default defineConfig({
  rsbuild: {
    source: {
      alias: {
        "@": "./app",
      },
    },
    output: {
      distPath: {
        root: "./dist",
      },
    },
  },
});
```

### 関数形式（完全な制御）

関数形式はデフォルト設定を受け取り、最終的な設定を返します：

```ts
// addfox.config.ts
import { defineConfig } from "addfox";

export default defineConfig({
  rsbuild: (base, helpers) => {
    // helpers.merge を使用して深いマージを行う
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

## よく使う設定

### パスエイリアス

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

コードで使用：

```ts
import { Button } from "@/components/Button";
import { formatDate } from "@/utils/date";
```

### グローバル変数の定義

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

### CSS の設定

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

### dev server の設定

```ts
export default defineConfig({
  rsbuild: {
    server: {
      port: 3000,
    },
  },
});
```

## 完全な設定例

```ts
import { defineConfig } from "addfox";
import { pluginReact } from "@rsbuild/plugin-react";

export default defineConfig({
  plugins: [pluginReact()],
  rsbuild: {
    source: {
      alias: {
        "@": "./app",
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
  },
});
```

## 注意事項

- オブジェクト形式は深いマージを行います
- 関数形式は完全に設定を制御できますが、自分でマージロジックを処理する必要があります
- `helpers.merge` を使用してマージすることをお勧めし、フレームワークのデフォルト設定を維持します

## 関連リンク

- [Rsbuild 設定ドキュメント](https://rsbuild.dev/config/)
- [Rsbuild プラグインリスト](https://rsbuild.dev/plugins/list)

## 関連設定

- [`plugins`](/ja/config/plugins) - Rsbuild プラグイン設定
