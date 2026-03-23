# テスト

Addfox は **Rstest** のテストサポートを組み込んでおり、`addfox test` を介した統一された実行を推奨します。

## 依存関係を先に確認

テストを実行する前に、必要な依存関係がインストールされていることを確認：

```bash
pnpm add -D @rstest/core
```

ブラウザ側の E2E を実行する場合は、さらに追加：

```bash
pnpm add -D @rstest/browser playwright
```

## 統一コマンド

優先的に使用：

```bash
addfox test
```

このコマンドは Addfox のテストワークフローを実行し、下位コマンドを手動で組み合わせる必要はありません。

## ユニットテスト（Unit）

適しています：

- ユーティリティ関数
- メッセージ処理ロジック
- 状態とストレージ処理

一般的な命名：

- `*.test.ts`
- `*.spec.ts`

## E2E テスト

適しています：

- 拡張機能の読み込みフロー検証
- popup/content/background のエンドツーエンド相互作用
- 重要なユーザーパスの回帰

CI またはリリース前に完全な E2E を1回実行することをお勧めします。

## 最小設定例

```ts
// rstest.config.ts
import { defineConfig } from "@rstest/core";

export default defineConfig({
  test: {
    include: ["**/*.test.ts", "**/*.spec.ts"],
  },
});
```

## 推奨スクリプト

```json
{
  "scripts": {
    "test": "addfox test"
  }
}
```

## 参考リンク

- [Rstest 公式ドキュメント](https://rstest.dev/)
- [Rstest ブラウザテストドキュメント](https://rstest.dev/guide/browser-testing)
