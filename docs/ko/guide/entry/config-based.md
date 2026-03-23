# 구성 기반 Entry

`addfox.config.ts`에서 `entry`와 `manifest`를 통해 구성 기반으로 다음을 수행할 수 있습니다:
- 사용자 지정 Entry 경로
- 자동 발견 결과 덮어쓰기
- **사용자 지정 Entry** 추가 (예: `capture`, `my-page` 등)

`entry`에 나열되지 않은 Entry는 여전히 [파일 기반 규칙](/guide/entry/file-based)을 통해 자동으로 발견됩니다.

## 핵심 원칙

파일 기반 Entry와 동일합니다:
- **Entry는 JS/TS여야 합니다**: Rsbuild 기반 빌드이므로 실제 Entry는 스크립트 파일만 될 수 있습니다
- **HTML 처리**: 내장 HTML Entry(popup/options 등)는 자동으로 생성되며, 사용자 지정 HTML 템플릿을 사용할 때는 `data-addfox-entry`로 Entry 스크립트를 표시해야 합니다
- **HTML 자동 생성 시** (사용자 지정 템플릿 없음): 페이지는 **`<div id="root"></div>`**를 포함합니다. **`<title>`**은 확장 매니페스트 **`manifest.name`**을 사용하며, **favicon**은 **`<link rel="icon">`**을 통해 **`manifest.icons`**의 경로를 사용합니다 (규칙에 따라 적절한 크기를 선택하고 경로는 출력 HTML 위치에 따라 상대 경로로 해석됩니다). 해당 Entry에서 **사용자 지정 HTML 템플릿**을 사용하는 경우 위의 `title` / 아이콘 주입이 자동으로 적용되지 않으며, 템플릿에서 `<title>`과 아이콘 `<link>`를 직접 작성해야 합니다 (`data-addfox-entry`와 마운트 노드는 여전히 필요하며, 일반적으로 여전히 `#root`입니다).

## 구성 작성법

### 1) `entry`로 Entry 구성

`entry`는 객체입니다: **키 = Entry 이름, 값 = 경로 또는 구성 객체**.

### 2) `manifest`로 Entry 관련 필드 구성

`manifest`에서 Entry 관련 기능 필드를 선언할 수 있습니다 (예: `background`, `action.default_popup`, `content_scripts`):

```ts
export default defineConfig({
  manifest: {
    manifest_version: 3,
    background: { service_worker: "background/index.js" },
    action: { default_popup: "popup/index.html" },
    content_scripts: [
      { matches: ["<all_urls>"], js: ["content/index.js"] },
    ],
  },
});
```

### 3) `entry`와 `manifest`의 우선순위

둘 다 Entry 해석에 참여할 때 우선순위는 다음과 같습니다:

1. `entry`에 명시적으로 구성
2. `manifest`의 Entry 관련 필드
3. 자동 발견 (파일 기반)

즉: `entry`는 동일한 이름의 다른 출처의 Entry를 덮어씁니다.

### 문자열 경로 (권장)

값은 **baseDir** (기본값 `app/`)을 기준으로 한 상대 경로입니다:

| 값 유형 | 의미 | 예시 |
|--------|------|------|
| 스크립트 경로 `.ts/.tsx` | 해당 스크립트를 Entry로 사용; 내장 HTML Entry는 자동으로 HTML을 생성하거나 동일한 디렉토리의 `index.html`을 템플릿으로 사용 | `"popup/index.ts"` |
| HTML 경로 `.html` | 해당 HTML을 템플릿으로 사용; `data-addfox-entry`로 Entry 스크립트를 해석해야 함 | `"popup/index.html"` |

### 객체 형식: `{ src, html? }`

더 세밀한 제어:

| 필드 | 타입 | 설명 |
|------|------|------|
| `src` | `string` | Entry 스크립트 경로 (baseDir 기준) **필수** |
| `html` | `boolean \| string` | `true`: 템플릿 없이 HTML 생성; `false`: 스크립트만; `string`: HTML 템플릿 경로 지정 |

## 내장 Entry 및 출력 경로

`entry`로 내장 Entry를 구성할 때 기본 출력 경로는 다음과 같습니다:

| Entry 이름 | 타입 | 출력 스크립트 | 출력 HTML |
|--------|------|----------|-----------|
| `background` | 스크립트만 | `background/index.js` | — |
| `content` | 스크립트만 | `content/index.js` | — |
| `popup` | 스크립트+HTML | `popup/index.js` | `popup/index.html` |
| `options` | 스크립트+HTML | `options/index.js` | `options/index.html` |
| `sidepanel` | 스크립트+HTML | `sidepanel/index.js` | `sidepanel/index.html` |
| `devtools` | 스크립트+HTML | `devtools/index.js` | `devtools/index.html` |
| `offscreen` | 스크립트+HTML | `offscreen/index.js` | `offscreen/index.html` |

:::info
manifest에서 프레임워크는 위의 경로를 사용하여 `action.default_popup`, `options_page` 등의 필드를 자동으로 채웁니다.
:::

## 구성 예시

### 일부 Entry 덮어쓰기

```ts
// addfox.config.ts
import { defineConfig } from "addfox";

export default defineConfig({
  entry: {
    // 이러한 Entry만 덮어쓰고, 나머지는 자동 발견
    popup: "popup/main.tsx",
    options: "options/settings.tsx",
  },
});
```

### 모든 Entry 완전히 구성

```ts
export default defineConfig({
  appDir: "src",
  entry: {
    background: "background/index.ts",
    content: "content/index.ts",
    popup: "popup/index.tsx",
    options: "options/index.tsx",
    sidepanel: "sidepanel/index.tsx",
  },
});
```

### 사용자 지정 Entry + 강제 HTML 생성

```ts
export default defineConfig({
  entry: {
    // 내장 Entry
    background: "background/index.ts",
    content: "content/index.ts",
    popup: "popup/index.tsx",
    
    // 사용자 지정 페이지 Entry (HTML 자동 생성)
    capture: { src: "pages/capture/index.tsx", html: true },
    
    // 사용자 지정 페이지 Entry (템플릿 사용)
    welcome: { src: "pages/welcome/index.tsx", html: "pages/welcome/template.html" },
    
    // 스크립트만 Entry (HTML 없음)
    worker: { src: "worker/index.ts", html: false },
  },
});
```

### Entry 자동 발견 비활성화

모든 Entry를 완전히 수동으로 제어해야 하는 경우:

```ts
export default defineConfig({
  entry: {
    background: "background/index.ts",
    content: "content/index.ts",
    popup: "popup/index.tsx",
    // ... 필요한 모든 Entry 나열
  },
  // 구성되지 않은 항목은 정의되지 않은 상태로 유지되며, 프레임워크는 entry에 나열된 Entry만 처리합니다
});
```

## 경로 해석 규칙

### baseDir 기준

`entry`의 모든 경로는 **baseDir**을 기준으로 하며, baseDir은 [`appDir`](/config/app-dir)에 의해 결정됩니다 (기본값 `app`):

```ts
export default defineConfig({
  appDir: "src",                    // baseDir = src/
  entry: {
    popup: "popup/index.ts",        // src/popup/index.ts 가리킴
  },
});
```

### 경로 빠른 참조표

| 구성 작성법 | Entry 스크립트 위치 | 일반적인 출력 |
|----------|--------------|----------|
| `background: "background/index.ts"` | `app/background/index.ts` | `extension/background/index.js` |
| `content: "content.ts"` | `app/content.ts` | `extension/content.js` |
| `popup: "popup/index.ts"` | `app/popup/index.ts` | `extension/popup/index.html` + `extension/popup/index.js` |
| `capture: { src: "capture/index.ts", html: true }` | `app/capture/index.ts` | `extension/capture/index.html` + `extension/capture/index.js` |

## 다음 단계

- [파일 기반 Entry](/ko/guide/entry/file-based) — 자동 발견 규칙 알아보기
- [appDir 구성](/ko/config/app-dir) — 소스 코드 디렉토리 수정
- [manifest 구성](/ko/config/manifest) — 확장 매니페스트 구성
