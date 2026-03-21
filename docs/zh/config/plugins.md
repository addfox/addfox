# plugins

`plugins` 用于配置 Rsbuild 插件。

## 概述

- **类型**：`RsbuildPlugin[]`
- **默认值**：`undefined`
- **是否必需**：否

## 用法

```ts
// addfox.config.ts
import { defineConfig } from "addfox";
import { pluginReact } from "@rsbuild/plugin-react";
import { pluginVue } from "@addfox/rsbuild-plugin-vue";

export default defineConfig({
  plugins: [
    pluginReact(),
    // 或 pluginVue(),
  ],
});
```

## 框架插件

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

### 其他框架

- **Preact**: `@rsbuild/plugin-preact`
- **Svelte**: `@rsbuild/plugin-svelte`
- **Solid**: `@rsbuild/plugin-solid`

## 其他常用插件

### TypeScript 类型检查

```ts
import { pluginTypeCheck } from "@rsbuild/plugin-type-check";

export default defineConfig({
  plugins: [pluginTypeCheck()],
});
```

### SVG 处理

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

## 内置插件

以下插件由 Addfox 自动注入，无需手动配置：

| 插件 | 作用 |
|------|------|
| `plugin-extension-entry` | 处理扩展入口和 HTML 生成 |
| `plugin-extension-manifest` | 处理 manifest 生成和路径注入 |
| `plugin-extension-hmr` | 开发时热重载（仅 dev 模式） |
| `plugin-extension-monitor` | 错误监控（dev + debug 模式） |

## 注意事项

- 插件数组会传递给 Rsbuild
- 插件执行顺序为数组顺序
- 框架插件会自动处理扩展特有的逻辑

## 相关配置

- [`rsbuild`](/config/rsbuild) - Rsbuild 配置
- [Rsbuild 插件列表](https://rsbuild.dev/plugins/list)
