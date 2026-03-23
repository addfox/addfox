# TypeScript

Addfox は Rsbuild に基づいており、`.ts` / `.tsx` を使用するための追加のコンパイルチェーン設定なしに、デフォルトで TypeScript 機能を提供します。

## 組み込みサポート機能

- **すぐに使えるコンパイル**：`.ts`、`.tsx` ファイルを自動的に処理。
- **型チェックの分離**：ビルドプロセスはコンパイルとパッケージングに集中。`tsc --noEmit` または IDE を使用して開発段階で型チェックを行うことができます。
- **複数エントリーとの協調**：`background`、`content`、`popup`、`options` などのエントリーで直接 TypeScript を使用可能。

## パスエイリアス（tsconfig を直接認識）

Addfox は `tsconfig.json`（または `tsconfig.base.json`）の `compilerOptions.baseUrl` と `compilerOptions.paths` を直接認識し、モジュール解決に使用します。  
つまり、一般的なパスエイリアス設定を Addfox 設定に再度記述する必要はありません。

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

その後、コードで直接使用：

```ts
import { getEnv } from "@/shared/env";
import { logger } from "@shared/logger";
```

## 推奨事項

- プロジェクトルートで `tsconfig` パスエイリアスを統一的に管理し、複数箇所での重複設定を避けます。
- CI に `tsc --noEmit` を追加し、型の問題を早期に検出します。

## 参考

- [Rsbuild TypeScript ガイド](https://rsbuild.rs/zh/guide/basic/typescript)
