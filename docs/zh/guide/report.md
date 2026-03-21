# 分析报告

Addfox 基于 **Rsdoctor** 提供构建分析报告能力，用于定位包体积、依赖结构和构建瓶颈。

## 适用场景

- 构建产物体积异常增大
- 某次改动后构建明显变慢
- 想分析入口 chunk、依赖重复和静态资源占比

## 启用方式

命令行：

```bash
addfox build --report
```

或在配置中启用：

```ts
export default defineConfig({
  report: true,
});
```

## 可以看到什么

- 入口与 chunk 拆分情况
- 依赖体积分布与重复依赖
- 构建时长和阶段耗时

## 建议流程

1. 先跑一次基线报告；
2. 大改动后再次生成报告；
3. 对比体积与耗时变化，再决定优化方向。

## 相关文档

- [配置: report](/zh/config/report)
- [配置: rsbuild](/zh/config/rsbuild)
- [Rsdoctor 官方文档](https://rsdoctor.rs/)
