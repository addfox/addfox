# outDir

`outDir` 用于指定构建输出的目录名称。

## 概述

- **类型**：`string`
- **默认值**：`"extension"`
- **是否必需**：否

## 用法

```ts
// addfox.config.ts
import { defineConfig } from "addfox";

export default defineConfig({
  outDir: "dist",  // 输出到 .addfox/dist/
});
```

## 完整输出路径

最终输出路径由以下部分组成：

```
{outputRoot}/{outDir}/
```

- `outputRoot`：固定为 `.addfox`
- `outDir`：默认为 `"extension"`，可自定义

默认完整路径：`.addfox/extension/`

## 示例

### 修改为 dist

```ts
export default defineConfig({
  outDir: "dist",
});
```

输出目录：`.addfox/dist/`

### 构建产物结构

```
.addfox/
├── dist/                   # 构建输出（outDir: "dist"）
│   ├── manifest.json
│   ├── background/
│   │   └── index.js
│   ├── content/
│   │   └── index.js
│   └── popup/
│       ├── index.html
│       └── index.js
└── cache/                  # 构建缓存
```

## 注意事项

- `outDir` 只影响输出目录的名称，父目录 `.addfox` 固定不变
- 修改 `outDir` 后，manifest 中的路径会自动更新
- 开发时浏览器加载的扩展目录也是这个路径

## 相关配置

- [`zip`](/config/zip) - 打包配置
- [guide/output](/guide/output) - 输出指南
