# zip

`zip` 用于控制构建完成后是否将输出目录打包为 zip 文件。

## 概述

- **类型**：`boolean`
- **默认值**：`true`
- **是否必需**：否

## 用法

```ts
// addfox.config.ts
import { defineConfig } from "addfox";

export default defineConfig({
  zip: true,   // 构建完成后打包
  // zip: false, // 不打包
});
```

## 输出位置

打包文件输出路径：

```
{outputRoot}/{outDir}.zip
```

默认：`.addfox/extension.zip`

## 示例

### 禁用打包

```ts
export default defineConfig({
  zip: false,
});
```

### 启用打包（默认）

```ts
export default defineConfig({
  zip: true,
});
```

或不配置（使用默认值）。

## 打包内容

zip 文件包含构建输出的全部内容：

- `manifest.json`
- 所有入口脚本和页面
- `public/` 目录中的静态资源

## 用途

打包后的 zip 文件可用于：
- 提交到 Chrome Web Store
- 提交到 Firefox Add-ons
- 分发和备份

## 相关配置

- [`outDir`](/config/out-dir) - 输出目录配置
- [guide/zip](/guide/zip) - 打包指南
