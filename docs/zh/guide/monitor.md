# 错误监控

Addfox 在开发模式可注入错误监控能力，把多入口运行时错误聚合到终端与监控页面，便于快速定位。

## 核心价值

- 自动捕获 `background`、`content`、`popup`、`options`、`sidepanel` 等入口错误
- 终端输出结构化错误块（入口、消息、位置、堆栈），更适合直接交给 AI 分析
- 提供监控页面（`/_addfox-monitor/`）查看错误列表与详情

## 启用方式

在 `addfox dev` 下启用：

```ts
// addfox.config.ts
export default defineConfig({
  debug: true,
});
```

或命令行临时启用：

```bash
addfox dev --debug
```

## 终端 AI 友好输出

当监控开启时，Addfox 会在终端输出便于 AI 使用的错误上下文，通常包含：

- 入口（entry）
- 错误消息（message）
- 发生位置（location）
- 堆栈（stack）

你可以直接把这段错误块复制给 AI，减少来回补充上下文成本。

## Firefox 说明

Firefox 扩展运行机制与 Chromium 不同（尤其是后台脚本生命周期与调试通道），因此错误监控行为可能与 Chromium 下不完全一致。  
如果发现 Firefox 下展示不一致，建议同时结合浏览器原生调试页（`about:debugging`）交叉确认。

## 注意事项

- 仅对开发模式生效（`addfox dev`）
- 生产构建会移除监控注入
- 错误数据默认本地可见，不会自动上传

## 相关配置

- [`debug`](/zh/config/debug) - 错误监控配置
