# plugins

`plugins` は Rsbuild プラグインを設定するために使用されます。

## 概要

- **型**: `RsbuildPlugin[]`
- **デフォルト値**: `undefined`
- **必須**: いいえ

## 使い方

```ts
// addfox.config.ts
import { defineConfig } from "addfox";
import { pluginReact } from "@rsbuild/plugin-react";
import { pluginVue } from "@addfox/rsbuild-plugin-vue";

export default defineConfig({
  plugins: [
    pluginReact(),
    // または pluginVue(),
  ],
});
```

## フレームワークプラグイン

### React

```bash
npm install @rsbuild/plugin-react
```

```ts
import { pluginReact } from "@rsbuild/plugin-react";

export default defineConfig({
  plugins: [pluginReact()],
});
```

### Vue

```bash
npm install @addfox/rsbuild-plugin-vue
```

```ts
import { pluginVue } from "@addfox/rsbuild-plugin-vue";

export default defineConfig({
  plugins: [pluginVue()],
});
```

### その他のフレームワーク

- **Preact**: `@rsbuild/plugin-preact`
- **Svelte**: `@rsbuild/plugin-svelte`
- **Solid**: `@rsbuild/plugin-solid`

## その他のよく使うプラグイン

### TypeScript 型チェック

```ts
import { pluginTypeCheck } from "@rsbuild/plugin-type-check";

export default defineConfig({
  plugins: [pluginTypeCheck()],
});
```

### SVG 処理

```ts
import { pluginSvgr } from "@rsbuild/plugin-svgr";

export default defineConfig({
  plugins: [
    pluginSvgr({
      svgrOptions: {
        exportType: "default",
      },
    }),
  ],
});
```

## 組み込みプラグイン

以下のプラグインは Addfox が自動的に注入するため、手動で設定する必要はありません：

| プラグイン | 機能 |
|------|------|
| `plugin-extension-entry` | 拡張機能エントリーと HTML 生成を処理 |
| `plugin-extension-manifest` | manifest 生成とパス注入を処理 |
| `plugin-extension-hmr` | 開発時のホットリロード（dev モードのみ） |
| `plugin-extension-monitor` | エラー監視（dev + debug モード） |

## 注意事項

- プラグイン配列は Rsbuild に渡されます
- プラグインの実行順序は配列の順序です
- フレームワークプラグインは自動的に拡張機能特有のロジックを処理します

## 関連設定

- [`rsbuild`](/ja/config/rsbuild) - Rsbuild 設定
- [Rsbuild プラグインリスト](https://rsbuild.dev/plugins/list)
