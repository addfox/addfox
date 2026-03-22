Addfox 的构建产物默认输出到 `.addfox/extension/` 下的浏览器特定子目录（如 `extension-chromium` 或 `extension-firefox`）。

## 默认输出结构

```tree
.addfox/
├── extension/
│   ├── extension-chromium/  # Chromium 产物
│   │   ├── manifest.json
│   │   ├── background/
│   │   │   └── index.js
│   │   ├── content/
│   │   │   ├── index.js
│   │   │   └── index.css
│   │   ├── popup/
│   │   │   ├── index.html
│   │   │   └── index.js
│   │   ├── options/
│   │   │   ├── index.html
│   │   │   └── index.js
│   │   └── icons/
│   │       └── icon*.png
│   └── extension-firefox/   # Firefox 产物
└── cache/                   # 开发缓存
```

## 自定义输出目录

可以通过 `outDir` 配置修改输出目录名称：

```ts
// addfox.config.ts
export default defineConfig({
  outDir: "dist",  // 输出到 .addfox/dist/
});
```

## 输出内容说明

### JavaScript 文件

- 所有入口脚本经 Rsbuild 打包后的产物
- 包含代码转换、压缩（生产模式）
- Source map（开发模式）

### HTML 文件

- 由 Rsbuild 自动生成或使用自定义模板
- 已注入对应的入口脚本
- **自动生成**的页面（无自定义 `index.html`）会包含 **`<div id="root"></div>`**；**`<title>`** 与扩展 **`manifest.name`** 一致；**页面图标**通过 **`<link rel="icon">`** 引用 **`manifest.icons`**。自定义 HTML 模板时需自行维护 title 与图标。

### CSS 文件

- 从入口脚本中 `import` 的样式
- 经 PostCSS 处理（如配置了 Tailwind 等）

### Manifest

- 最终生成的 `manifest.json`
- 包含所有入口路径和配置

### 静态资源

- `public/` 目录下的文件原样复制
- 扩展图标、国际化文件等

## 开发 vs 生产

### 开发模式 (`addfox dev`)

- 输出到 `.addfox/extension/`
- 包含 Source map
- 代码未压缩
- 浏览器直接加载此目录

### 生产模式 (`addfox build`)

- 同样输出到 `.addfox/extension/`
- 代码压缩优化
- 可生成 zip 文件（默认启用）

## 打包

构建完成后，默认会打包为 zip：

```tree
.addfox/
├── extension/          # 构建输出
└── extension.zip       # 打包文件（用于分发）
```

可通过 `zip: false` 禁用：

```ts
export default defineConfig({
  zip: false,
});
```

## 相关配置

- [`outDir`](/config/out-dir) - 输出目录名称
- [`zip`](/config/zip) - 打包配置
