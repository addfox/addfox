# TypeScript

Addfox 基于 Rsbuild，默认提供 TypeScript 能力，无需额外接入编译链即可使用 `.ts` / `.tsx`。

## 内置支持能力

- **开箱即用编译**：自动处理 `.ts`、`.tsx` 文件。
- **类型检查分离**：构建流程专注编译与打包；你可以通过 `tsc --noEmit` 或 IDE 在开发阶段做类型校验。
- **与多入口协作**：在 `background`、`content`、`popup`、`options` 等入口中都可直接使用 TypeScript。

## 路径别名（直接识别 tsconfig）

Addfox 会直接识别 `tsconfig.json`（或 `tsconfig.base.json`）中的 `compilerOptions.baseUrl` 与 `compilerOptions.paths`，用于模块解析。  
也就是说，常见的路径别名配置不需要额外再写一份到 Addfox 配置里。

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["app/*"],
      "@shared/*": ["shared/*"]
    }
  }
}
```

随后可以在代码中直接使用：

```ts
import { getEnv } from "@/shared/env";
import { logger } from "@shared/logger";
```

## 建议

- 统一在项目根目录维护 `tsconfig` 路径别名，避免多处重复配置。
- 在 CI 中增加 `tsc --noEmit`，确保类型问题尽早暴露。

## 参考

- [Rsbuild TypeScript 指南](https://rsbuild.rs/zh/guide/basic/typescript)
