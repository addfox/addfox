# Rsbuild 配置

Addfox 基于 [Rsbuild](https://rsbuild.dev/) 构建，你可以完全自定义构建配置。

## 配置方式

在 `addfox.config.ts` 中使用 `rsbuild` 字段：

```ts
// addfox.config.ts
import { defineConfig } from "addfox";

export default defineConfig({
  rsbuild: {
    // 你的 Rsbuild 配置
  },
});
```

## 常用配置

### 路径别名

简化模块导入路径：

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

### 全局变量定义

在编译时注入全局常量：

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

在代码中使用：

```ts
console.log(__VERSION__);  // "1.0.0"
console.log(__DEV__);      // true / false
```

### CSS 配置

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

安装插件：

```bash
pnpm add -D @rsbuild/plugin-sass sass
```

配置：

```ts
import { pluginSass } from "@rsbuild/plugin-sass";

export default defineConfig({
  plugins: [pluginSass()],
});
```

详见 [Sass 集成指南](/guide/style-integration/sass)。

#### Less

安装插件：

```bash
pnpm add -D @rsbuild/plugin-less less
```

配置：

```ts
import { pluginLess } from "@rsbuild/plugin-less";

export default defineConfig({
  plugins: [pluginLess()],
});
```

详见 [Less 集成指南](/guide/style-integration/less)。

#### Tailwind CSS

详见 [Tailwind CSS 集成指南](/guide/style-integration/tailwindcss)。

### 构建优化

#### 代码分割

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

#### 资源内联

```ts
export default defineConfig({
  rsbuild: {
    output: {
      dataUriLimit: {
        svg: 4096,      // 4KB 以下的 SVG 内联
        font: 4096,     // 4KB 以下的字体内联
      },
    },
  },
});
```

## 函数形式配置

需要完全控制配置时使用：

```ts
export default defineConfig({
  rsbuild: (base, helpers) => {
    // base: 默认配置
    // helpers.merge: 深度合并工具
    
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

## 添加插件

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

## 完整示例

```ts
import { defineConfig } from "addfox";
import { pluginReact } from "@rsbuild/plugin-react";

export default defineConfig({
  manifest: {
    name: "我的扩展",
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
      // 自定义工具配置
    },
  },
});
```

## 注意事项

- 配置会与 Addfox 的默认配置深度合并
- 函数形式可以完全控制配置，但需要自行处理合并
- 建议使用 `helpers.merge` 保持默认配置

## 相关链接

- [Rsbuild 配置文档](https://rsbuild.dev/config/)
- [Rsbuild 插件列表](https://rsbuild.dev/plugins/list)

## 相关配置

- [`plugins`](/config/plugins) - Rsbuild 插件配置
