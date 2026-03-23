# plugins

`plugins`는 Rsbuild 플러그인을 구성하는 데 사용됩니다.

## 개요

- **타입**: `RsbuildPlugin[]`
- **기본값**: `undefined`
- **필수 여부**: 아니오

## 사용법

```ts
// addfox.config.ts
import { defineConfig } from "addfox";
import { pluginReact } from "@rsbuild/plugin-react";
import { pluginVue } from "@addfox/rsbuild-plugin-vue";

export default defineConfig({
  plugins: [
    pluginReact(),
    // 또는 pluginVue(),
  ],
});
```

## 프레임워크 플러그인

### React

```bash
npm install @rsbuild/plugin-react
```

```ts
import { pluginReact } from "@rsbuild/plugin-react";

export default defineConfig({
  plugins: [pluginReact()],
});
```

### Vue

```bash
npm install @addfox/rsbuild-plugin-vue
```

```ts
import { pluginVue } from "@addfox/rsbuild-plugin-vue";

export default defineConfig({
  plugins: [pluginVue()],
});
```

### 다른 프레임워크

- **Preact**: `@rsbuild/plugin-preact`
- **Svelte**: `@rsbuild/plugin-svelte`
- **Solid**: `@rsbuild/plugin-solid`

## 다른 유용한 플러그인

### TypeScript 타입 검사

```ts
import { pluginTypeCheck } from "@rsbuild/plugin-type-check";

export default defineConfig({
  plugins: [pluginTypeCheck()],
});
```

### SVG 처리

```ts
import { pluginSvgr } from "@rsbuild/plugin-svgr";

export default defineConfig({
  plugins: [
    pluginSvgr({
      svgrOptions: {
        exportType: "default",
      },
    }),
  ],
});
```

## 내장 플러그인

다음 플러그인은 Addfox가 자동으로 주입하며 수동으로 구성할 필요가 없습니다:

| 플러그인 | 역할 |
|------|------|
| `plugin-extension-entry` | 확장 Entry 및 HTML 생성 처리 |
| `plugin-extension-manifest` | manifest 생성 및 경로 주입 처리 |
| `plugin-extension-hmr` | 개발 시 핫 리로드 (dev 모드 전용) |
| `plugin-extension-monitor` | 오류 모니터링 (dev + debug 모드) |

## 주의사항

- 플러그인 배열은 Rsbuild에 전달됩니다
- 플러그인 실행 순서는 배열 순서입니다
- 프레임워크 플러그인은 확장 특유의 로직을 자동으로 처리합니다

## 관련 설정

- [`rsbuild`](/config/rsbuild) - Rsbuild 구성
- [Rsbuild 플러그인 목록](https://rsbuild.dev/plugins/list)
