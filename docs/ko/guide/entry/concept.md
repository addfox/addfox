# Entry 개념

**Entry**는 브라우저 확장의 다양한 기능 모듈에 해당하며, 백그라운드 스크립트, 콘텐츠 스크립트, 팝업 페이지 등입니다. Addfox는 세 가지 구성 방식을 제공하며, 단독으로 사용하거나 혼합하여 사용할 수 있습니다.

## Entry란 무엇인가

브라우저 확장은 여러 독립적인 기능 모듈로 구성되며, 각 모듈에는 Entry 파일이 필요합니다:

| Entry 유형 | 브라우저 확장 개념에 해당 | 일반적인 용도 |
|----------|-------------------|----------|
| `background` | Service Worker / 백그라운드 스크립트 | 확장 수명 주기 처리, 크로스 페이지 통신 |
| `content` | Content Script | 웹페이지 DOM 조작, 페이지와 상호 작용 |
| `popup` | 팝업 페이지 | 툴 바 아이콘 클릭 후 팝업 인터페이스 |
| `options` | 옵션 페이지 | 확장 설정 인터페이스 |
| `sidepanel` | 사이드바 | Chrome 사이드 패널 |
| `devtools` | 개발자 도구 | 사용자 지정 DevTools 패널 |
| `offscreen` | Offscreen 문서 | DOM API가 필요한 백그라운드 작업 |

**`popup` / `options` / `sidepanel` / `devtools` / `offscreen`** 등 HTML이 필요한 Entry의 경우: **사용자 지정** `index.html`을 **제공하지 않으면** 빌드가 **자동으로** 페이지를 생성하며, 여기에는 **`<div id="root"></div>`**가 포함됩니다. **`<title>`**은 **`manifest.name`**과 일치하며, **탭 아이콘**은 **`<link rel="icon">`**을 통해 **`manifest.icons`**에서 가져옵니다. 사용자 지정 HTML 템플릿을 사용할 때는 title, 아이콘 및 마운트 노드를 직접 작성해야 합니다 (자세한 내용은 [파일 기반 Entry](/guide/entry/file-based) 참조).

## 구성 방식

### 방식 1: 파일 기반 (권장)

**`entry`를 구성하지 않고**, 프레임워크가 디렉토리와 파일 이름에 따라 Entry를 자동으로 발견하도록 합니다.

```tree
app/
├── background/
│   └── index.ts      # → background Entry
├── content/
│   └── index.ts      # → content Entry
├── popup/
│   └── index.ts      # → popup Entry
└── ...
```

장점:
- 제로 구성, 규칙을 따르기만 하면 됩니다
- 새로운 Entry를 추가하려면 해당 디렉토리를 만들기만 하면 됩니다
- 코드 구조가 명확합니다

자세한 내용은 [파일 기반 Entry](/guide/entry/file-based)를 참조하세요.

### 방식 2: 구성 기반 (entry + manifest)

`addfox.config.ts`에서 `entry`와 `manifest`를 통해 Entry 관련 기능을 구성합니다:

```ts
export default defineConfig({
  entry: {
    background: "background/index.ts",
    content: "content/index.ts",
    popup: "popup/index.ts",
  },
  manifest: {
    manifest_version: 3,
    action: { default_popup: "popup/index.html" },
  },
});
```

장점:
- Entry 및 매니페스트 구성의 중앙 집중식 관리
- 사용자 지정 Entry 이름 지원
- 자동 발견 결과를 덮어쓸 수 있습니다

자세한 내용은 [구성 기반 Entry](/ko/guide/entry/config-based) 및 [manifest 구성](/ko/config/manifest)을 참조하세요.

### 혼합 사용

세 가지 방식을 혼합하여 사용할 수 있으며, 우선순위는 다음과 같습니다:

1. **최고**: `config.entry`에 구성된 Entry
2. **둘째**: manifest에 지정된 소스 파일 경로
3. **셋째**: 자동 발견

```ts
export default defineConfig({
  entry: {
    // 최고 우선순위: 다른 모든 구성 덮어쓰기
    popup: "pages/popup/main.ts",
  },
  manifest: {
    // 둘째 우선순위: entry가 지정되지 않을 때 사용
    background: { service_worker: "./background/index.ts" },
    // popup은 entry의 구성을 사용하며, 여기서는 사용하지 않습니다
    action: { default_popup: "./popup/index.ts" },
  },
  // 셋째 우선순위: 구성되지 않은 Entry 자동 발견
});
```

## 핵심 원칙

### Entry는 JS/TS여야 합니다

Addfox는 **Rsbuild**를 기반으로 빌드하며, 실제 빌드 Entry는 `.js`, `.jsx`, `.ts`, `.tsx` 스크립트 파일만 될 수 있습니다.

### HTML 처리

- **HTML이 필요 없는 Entry**: `background`, `content`는 스크립트 파일만 필요
- **HTML이 필요한 Entry**: `popup`, `options`, `sidepanel`, `devtools`, `offscreen`
  - HTML을 제공하지 않으면 Rsbuild가 자동으로 생성합니다 (`<div id="root"></div>` 포함)
  - 사용자 지정 HTML 템플릿을 제공하는 경우 템플릿에서 `data-addfox-entry`로 Entry 스크립트를 표시해야 합니다

### 예시: 사용자 지정 HTML 템플릿

```html
<!-- app/popup/index.html -->
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>팝업</title>
  </head>
  <body>
    <div id="root"></div>
    <!-- data-addfox-entry로 Entry 표시 -->
    <script type="module" data-addfox-entry src="./index.ts"></script>
  </body>
</html>
```

## 내장 Entry 및 사용자 지정 Entry

### 내장 Entry (예약 이름)

다음 이름들은 특수한 의미를 가지며, Addfox가 자동으로 인식하고 처리합니다:

| Entry 이름 | 설명 |
|--------|------|
| `background` | Service Worker (MV3) 또는 백그라운드 페이지 (MV2) |
| `content` | 콘텐츠 스크립트 |
| `popup` | 툴 바 팝업 |
| `options` | 확장 옵션 페이지 |
| `sidepanel` | 사이드바 |
| `devtools` | 개발자 도구 |
| `offscreen` | Offscreen 문서 |

:::warning
내장 Entry 이름은 수정할 수 없습니다. 프레임워크는 이러한 이름을 자동 인식 및 manifest 경로 채우기에 의존합니다.
:::

### 사용자 지정 Entry

내장 Entry 외에도 `entry`에서 임의의 이름을 **사용자 지정 Entry**로 구성할 수 있습니다 (예: `capture`, `my-page`):

```ts
export default defineConfig({
  entry: {
    capture: { src: "capture/index.ts", html: true },
  },
});
```

사용자 지정 Entry는 독립적인 페이지를 생성하며 `chrome-extension://<id>/capture/index.html`로 접근할 수 있습니다.

## 다음 단계

- [파일 기반 Entry](/ko/guide/entry/file-based) — 규칙 기반 Entry 발견 규칙 학습
- [구성 기반 Entry](/ko/guide/entry/config-based) — entry + manifest를 명시적으로 구성하는 방법 알아보기
- [manifest 구성](/ko/config/manifest) — manifest에서 확장 기능 구성
