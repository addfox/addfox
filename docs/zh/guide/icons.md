# 图标

浏览器扩展需要一套图标用于工具栏、扩展管理页面和 Web Store。

## 图标尺寸

Chrome 扩展推荐以下尺寸：

| 尺寸 | 用途 |
|------|------|
| 16x16 | 工具栏图标（Favicon） |
| 32x32 | 工具栏图标（Retina） |
| 48x48 | 扩展管理页面 |
| 128x128 | Web Store 和安装提示 |

Firefox 额外支持：

| 尺寸 | 用途 |
|------|------|
| 19x19 | 工具栏图标 |
| 38x38 | 工具栏图标（Retina） |
| 96x96 | 扩展管理页面 |

## 目录结构

将图标放在 `public/icons/`：

```tree
public/
└── icons/
    ├── icon16.png
    ├── icon32.png
    ├── icon48.png
    └── icon128.png
```

## 在 Manifest 中配置

```json
{
  "icons": {
    "16": "icons/icon16.png",
    "32": "icons/icon32.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  },
  "action": {
    "default_icon": {
      "16": "icons/icon16.png",
      "32": "icons/icon32.png"
    }
  }
}
```

## 动态设置图标

在代码中可以动态更改图标：

```ts
// 设置工具栏图标
chrome.action.setIcon({
  path: {
    16: "icons/icon-active16.png",
    32: "icons/icon-active32.png",
  },
});

// 设置标题
chrome.action.setTitle({ title: "Active Mode" });

// 设置徽章
chrome.action.setBadgeText({ text: "3" });
chrome.action.setBadgeBackgroundColor({ color: "#FF0000" });
```

## 深色模式适配

为不同主题提供不同图标：

```ts
// 检测系统主题并设置相应图标
if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
  chrome.action.setIcon({
    path: {
      16: "icons/icon-dark16.png",
      32: "icons/icon-dark32.png",
    },
  });
}
```

## 图标设计建议

1. **简洁清晰** — 小尺寸下仍能辨认
2. **品牌一致** — 与扩展功能或品牌相关
3. **对比度高** — 在不同背景下清晰可见
4. **避免文字** — 小尺寸下文字难以辨认
5. **使用 PNG** — 支持透明背景

## SVG 图标

Chrome 也支持 SVG 图标：

```json
{
  "icons": {
    "16": "icons/icon16.svg",
    "32": "icons/icon32.svg"
  }
}
```

但部分场景（如 Web Store）仍需要 PNG，建议同时提供。

## 生成图标工具

- [Figma](https://figma.com/) — 设计图标并导出多尺寸
- [Icon Kitchen](https://icon.kitchen/) — 在线生成扩展图标
- [RealFaviconGenerator](https://realfavicongenerator.net/) — 生成多尺寸图标

## 完整示例

```ts
// addfox.config.ts
export default defineConfig({
  manifest: {
    name: "我的扩展",
    icons: {
      16: "icons/icon16.png",
      32: "icons/icon32.png",
      48: "icons/icon48.png",
      128: "icons/icon128.png",
    },
    action: {
      default_icon: {
        16: "icons/icon16.png",
        32: "icons/icon32.png",
      },
    },
  },
});
```

## 相关链接

- [Chrome 图标规范](https://developer.chrome.com/docs/extensions/mv3/user_interface/#icons)
- [Chrome Web Store 图标要求](https://developer.chrome.com/docs/webstore/images/#icons)
