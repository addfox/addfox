# Rsbuild 구성

Addfox는 [Rsbuild](https://rsbuild.dev/)를 기반으로 빌드하며, 빌드 구성을 완전히 사용자 지정할 수 있습니다.

## 구성 방식

`addfox.config.ts`에서 `rsbuild` 필드를 사용합니다:

```ts
// addfox.config.ts
import { defineConfig } from "addfox";

export default defineConfig({
  rsbuild: {
    // 귀하의 Rsbuild 구성
  },
});
```

## 일반적인 구성

### 경로 별칭

모듈 가져오기 경로를 단순화합니다:

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

사용:

```ts
import { Button } from "@/components/Button";
import { formatDate } from "@/utils/date";
```

### 전역 변수 정의

컴파일 시 전역 상수를 주입합니다:

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

코드에서 사용:

```ts
console.log(__VERSION__);  // "1.0.0"
console.log(__DEV__);      // true / false
```

### CSS 구성

#### CSS Modules

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

#### Sass

플러그인 설치:

```bash
pnpm add -D @rsbuild/plugin-sass sass
```

구성:

```ts
import { pluginSass } from "@rsbuild/plugin-sass";

export default defineConfig({
  plugins: [pluginSass()],
});
```

자세한 내용은 [Sass 통합 가이드](/guide/style-integration/sass)를 참조하세요.

#### Less

플러그인 설치:

```bash
pnpm add -D @rsbuild/plugin-less less
```

구성:

```ts
import { pluginLess } from "@rsbuild/plugin-less";

export default defineConfig({
  plugins: [pluginLess()],
});
```

자세한 내용은 [Less 통합 가이드](/guide/style-integration/less)를 참조하세요.

#### Tailwind CSS

자세한 내용은 [Tailwind CSS 통합 가이드](/guide/style-integration/tailwindcss)를 참조하세요.

### 빌드 최적화

#### 코드 분할

```ts
export default defineConfig({
  rsbuild: {
    performance: {
      chunkSplit: {
        strategy: "split-by-experience",
      },
    },
  },
});
```

#### 리소스 인라인

```ts
export default defineConfig({
  rsbuild: {
    output: {
      dataUriLimit: {
        svg: 4096,      // 4KB 이하의 SVG 인라인
        font: 4096,     // 4KB 이하의 폰트 인라인
      },
    },
  },
});
```

## 함수 형식 구성

완전한 제어가 필요할 때 사용:

```ts
export default defineConfig({
  rsbuild: (base, helpers) => {
    // base: 기본 구성
    // helpers.merge: 깊은 병합 도구
    
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

## 플러그인 추가

```ts
import { pluginReact } from "@rsbuild/plugin-react";
import { pluginSvgr } from "@rsbuild/plugin-svgr";

export default defineConfig({
  plugins: [
    pluginReact(),
    pluginSvgr(),
  ],
});
```

## 전체 예시

```ts
import { defineConfig } from "addfox";
import { pluginReact } from "@rsbuild/plugin-react";

export default defineConfig({
  manifest: {
    name: "내 확장",
    version: "1.0.0",
    manifest_version: 3,
  },
  
  plugins: [pluginReact()],
  
  rsbuild: {
    source: {
      alias: {
        "@": "./app",
        "@/components": "./app/components",
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
    
    tools: {
      // 사용자 지정 도구 구성
    },
  },
});
```

## 주의사항

- 구성은 Addfox의 기본 구성과 깊게 병합됩니다
- 함수 형식은 완전히 구성을 제어할 수 있지만 병합을 직접 처리해야 합니다
- 기본 구성을 유지하려면 `helpers.merge` 사용을 권장합니다

## 관련 링크

- [Rsbuild 구성 문서](https://rsbuild.dev/config/)
- [Rsbuild 플러그인 목록](https://rsbuild.dev/plugins/list)

## 관련 설정

- [`plugins`](/config/plugins) - Rsbuild 플러그인 구성
