# 测试

Addfox 内置对 **Rstest** 的测试支持，推荐统一通过 `addfox test` 执行测试。

## 先检查依赖

运行测试前，先确保必要依赖已安装：

```bash
pnpm add -D @rstest/core
```

如果你要跑浏览器侧 E2E，再补充：

```bash
pnpm add -D @rstest/browser playwright
```

## 统一命令

优先使用：

```bash
addfox test
```

该命令会走 Addfox 的测试工作流，不需要手动拼接底层命令。

## 单元测试（Unit）

适合：

- 工具函数
- 消息处理逻辑
- 状态与存储处理

常见命名：

- `*.test.ts`
- `*.spec.ts`

## E2E 测试

适合：

- 扩展加载流程验证
- popup/content/background 端到端交互
- 关键用户路径回归

建议在 CI 或发布前执行一次完整 E2E。

## 最小配置示例

```ts
// rstest.config.ts
import { defineConfig } from "@rstest/core";

export default defineConfig({
  test: {
    include: ["**/*.test.ts", "**/*.spec.ts"],
  },
});
```

## 建议脚本

```json
{
  "scripts": {
    "test": "addfox test"
  }
}
```

## 参考链接

- [Rstest 官方文档](https://rstest.dev/)
- [Rstest 浏览器测试文档](https://rstest.dev/guide/browser-testing)
