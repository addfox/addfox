# report

`report` 用于启用 Rsdoctor 构建分析报告。

## 概述

- **类型**：`boolean | RsdoctorReportOptions`
- **默认值**：`false`
- **是否必需**：否

## 用法

```ts
// addfox.config.ts
import { defineConfig } from "addfox";

export default defineConfig({
  report: true,  // 启用 Rsdoctor 报告
});
```

## 配置方式

### 布尔值

```ts
export default defineConfig({
  report: true,   // 启用报告
  // report: false, // 禁用报告（默认）
});
```

### 对象形式

传递 Rsdoctor 配置选项：

```ts
export default defineConfig({
  report: {
    mode: "normal",
    port: 9988,
    disableClientServer: false,
  },
});
```

## Rsdoctor 选项

| 选项 | 类型 | 说明 |
|------|------|------|
| `mode` | `"brief" \| "normal" \| "lite"` | 报告模式 |
| `port` | `number` | 报告服务器端口 |
| `disableClientServer` | `boolean` | 是否禁用客户端服务器 |
| `output` | `object` | 输出配置 |

更多选项请参考 [Rsdoctor 文档](https://rsdoctor.rs/config/options/options)。

## CLI 启用

```bash
# 启用报告
addfox dev -r
addfox build -r

# 或使用 --report
addfox dev --report
```

CLI 参数会覆盖配置中的 `report` 值。

## 报告内容

启用后，构建完成会自动打开分析报告页面，包含：

- 构建耗时分析
- 模块依赖关系
- 包体积分析
- 重复依赖检测
- 编译警告和错误

## 注意事项

- 报告功能会增加构建时间
- 建议在排查构建问题时启用
- 生产构建也可以使用

## 相关链接

- [Rsdoctor 官方文档](https://rsdoctor.rs/)
