# rsbuild

`rsbuild` 用于自定义或扩展 Rsbuild 配置。

## 概述

- **类型**：`RsbuildConfig | ((base: RsbuildConfig, helpers: RsbuildConfigHelpers) => RsbuildConfig | Promise<RsbuildConfig>)`
- **默认值**：`undefined`
- **是否必需**：否

## 配置方式

### 对象形式（深度合并）

配置对象会与默认配置深度合并：

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

### 函数形式（完全控制）

函数形式接收默认配置，返回最终配置：

```ts
// addfox.config.ts
import { defineConfig } from "addfox";

export default defineConfig({
  rsbuild: (base, helpers) => {
    // 使用 helpers.merge 进行深度合并
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

## 常用配置

### 路径别名

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

在代码中使用：

```ts
import { Button } from "@/components/Button";
import { formatDate } from "@/utils/date";
```

### 定义全局变量

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

### 配置 CSS

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

### 配置 dev server

```ts
export default defineConfig({
  rsbuild: {
    server: {
      port: 3000,
    },
  },
});
```

## 完整的配置示例

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

## 注意事项

- 对象形式会进行深度合并
- 函数形式可以完全控制配置，但需要自己处理合并逻辑
- 建议优先使用 `helpers.merge` 进行合并，保持框架默认配置

## 相关链接

- [Rsbuild 配置文档](https://rsbuild.dev/config/)
- [Rsbuild 插件列表](https://rsbuild.dev/plugins/list)

## 相关配置

- [`plugins`](/config/plugins) - Rsbuild 插件配置
