# appDir

`appDir` 用于指定应用源代码目录，是入口发现和 manifest 自动加载的基准路径。

## 概述

- **类型**：`string`
- **默认值**：`"app"`
- **是否必需**：否

## 用法

```ts
// addfox.config.ts
import { defineConfig } from "addfox";

export default defineConfig({
  appDir: "src",  // 使用 src 目录作为应用根目录
});
```

## 作用

设置 `appDir` 后会影响以下行为：

1. **入口发现** — 从 `appDir` 目录下自动发现入口
2. **entry 路径解析** — `entry` 配置中的路径相对于 `appDir`
3. **manifest 加载** — 从 `appDir` 或其子目录加载 manifest 文件

## 示例

### 使用 src 目录

```ts
// addfox.config.ts
export default defineConfig({
  appDir: "src",
});
```

目录结构：

```tree
my-extension/
├── src/                    # 应用源代码
│   ├── background/
│   │   └── index.ts
│   ├── content/
│   │   └── index.ts
│   ├── popup/
│   │   └── index.tsx
│   └── manifest.json
├── addfox.config.ts
└── package.json
```

### 使用项目根目录

```ts
// addfox.config.ts
export default defineConfig({
  appDir: ".",  // 使用项目根目录
});
```

## 注意事项

- `appDir` 会被解析为绝对路径（相对于项目根目录）
- 建议保持默认 `"app"` 或常用 `"src"`，便于团队协作
- 修改 `appDir` 后，确保相应更新 `entry` 中的路径

## 相关配置

- [`entry`](/config/entry) - 入口配置
- [`manifest`](/config/manifest) - 扩展清单配置
- [guide/app-dir](/guide/app-dir) - 目录结构指南
