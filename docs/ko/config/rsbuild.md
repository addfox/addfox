# rsbuild

`rsbuild`는 Rsbuild 구성을 사용자 지정하거나 확장하는 데 사용됩니다.

## 개요

- **타입**: `RsbuildConfig | ((base: RsbuildConfig, helpers: RsbuildConfigHelpers) => RsbuildConfig | Promise<RsbuildConfig>)`
- **기본값**: `undefined`
- **필수 여부**: 아니오

## 구성 방식

### 객체 형식 (깊은 병합)

구성 객체는 기본 구성과 깊게 병합됩니다:

```ts
// addfox.config.ts
import { defineConfig } from "addfox";

export default defineConfig({
  rsbuild: {
    source: {
      alias: {
        "@": "./app",
      },
    },
    output: {
      distPath: {
        root: "./dist",
      },
    },
  },
});
```

### 함수 형식 (완전한 제어)

함수 형식은 기본 구성을 받아 최종 구성을 반환합니다:

```ts
// addfox.config.ts
import { defineConfig } from "addfox";

export default defineConfig({
  rsbuild: (base, helpers) => {
    // helpers.merge를 사용하여 깊은 병합 수행
    return helpers.merge(base, {
      source: {
        alias: {
          "@": "./app",
        },
      },
    });
  },
});
```

## 일반적인 구성

### 경로 별칭

```ts
export default defineConfig({
  rsbuild: {
    source: {
      alias: {
        "@": "./app",
        "@/components": "./app/components",
        "@/utils": "./app/utils",
      },
    },
  },
});
```

코드에서 사용:

```ts
import { Button } from "@/components/Button";
import { formatDate } from "@/utils/date";
```

### 전역 변수 정의

```ts
export default defineConfig({
  rsbuild: {
    source: {
      define: {
        __VERSION__: JSON.stringify(process.env.npm_package_version),
        __DEV__: JSON.stringify(process.env.NODE_ENV === "development"),
      },
    },
  },
});
```

### CSS 구성

```ts
export default defineConfig({
  rsbuild: {
    css: {
      modules: {
        localIdentName: "[local]--[hash:base64:5]",
      },
    },
  },
});
```

### dev server 구성

```ts
export default defineConfig({
  rsbuild: {
    server: {
      port: 3000,
    },
  },
});
```

## 전체 예시

```ts
import { defineConfig } from "addfox";
import { pluginReact } from "@rsbuild/plugin-react";

export default defineConfig({
  plugins: [pluginReact()],
  rsbuild: {
    source: {
      alias: {
        "@": "./app",
      },
      define: {
        __VERSION__: JSON.stringify("1.0.0"),
      },
    },
    output: {
      polyfill: "usage",
    },
    performance: {
      chunkSplit: {
        strategy: "split-by-experience",
      },
    },
  },
});
```

## 주의사항

- 객체 형식은 깊은 병합을 수행합니다
- 함수 형식은 완전히 구성을 제어할 수 있지만 병합 로직을 직접 처리해야 합니다
- 프레임워크의 기본 구성을 유지하려면 `helpers.merge` 사용을 권장합니다

## 관련 링크

- [Rsbuild 구성 문서](https://rsbuild.dev/config/)
- [Rsbuild 플러그인 목록](https://rsbuild.dev/plugins/list)

## 관련 설정

- [`plugins`](/config/plugins) - Rsbuild 플러그인 구성
