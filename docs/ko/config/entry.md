# entry

`entry`는 확장의 Entry 매핑을 사용자 지정하는 데 사용됩니다. 구성되지 않으면 프레임워크가 애플리케이션 디렉토리에서 Entry를 자동으로 발견합니다.

## 개요

- **타입**: `Record<string, EntryConfigValue> | undefined`
- **기본값**: `undefined` (자동 발견)
- **필수 여부**: 아니오

```ts
type EntryConfigValue = 
  | string                           // 스크립트 경로
  | { src: string; html?: boolean | string };  // 객체 형식
```

## 예약 Entry 이름

다음 이름들은 브라우저 확장의 표준 Entry에 해당하는 특수한 의미를 가집니다:

| Entry 이름 | 타입 | 설명 |
|--------|------|------|
| `background` | 스크립트만 | Service Worker / 백그라운드 스크립트 |
| `content` | 스크립트만 | Content Script |
| `popup` | 스크립트 + HTML | 팝업 페이지 |
| `options` | 스크립트 + HTML | 옵션 페이지 |
| `sidepanel` | 스크립트 + HTML | 사이드바 |
| `devtools` | 스크립트 + HTML | 개발자 도구 페이지 |
| `offscreen` | 스크립트 + HTML | Offscreen 문서 |

## 구성 방식

### 문자열 형식

값은 baseDir(기본값 `app/`)을 기준으로 한 상대 경로입니다.

```ts
export default defineConfig({
  entry: {
    background: "background/index.ts",
    content: "content/index.ts",
    popup: "popup/index.tsx",
  },
});
```

### 객체 형식

더 세밀한 제어:

```ts
export default defineConfig({
  entry: {
    // HTML 자동 생성
    popup: { src: "popup/index.tsx", html: true },
    
    // 사용자 지정 HTML 템플릿 사용
    options: { src: "options/index.tsx", html: "options/template.html" },
    
    // 스크립트만 (HTML 없음)
    worker: { src: "worker/index.ts", html: false },
  },
});
```

### 사용자 지정 Entry

예약 이름 외에도 임의의 이름을 사용자 지정 페이지 Entry로 추가할 수 있습니다:

```ts
export default defineConfig({
  entry: {
    // 내장 Entry
    background: "background/index.ts",
    popup: "popup/index.tsx",
    
    // 사용자 지정 Entry
    capture: { src: "pages/capture/index.tsx", html: true },
    welcome: { src: "pages/welcome/index.tsx", html: true },
  },
});
```

사용자 지정 Entry는 독립적인 페이지를 생성하며 `chrome-extension://<id>/capture/index.html`로 접근할 수 있습니다.

## 경로 규칙

- 모든 경로는 [**baseDir**](/config/app-dir)을 기준으로 합니다 (기본값 `app/`)
- Entry는 `.js`, `.jsx`, `.ts`, `.tsx` 스크립트여야 합니다
- 사용자 지정 HTML 템플릿을 사용할 때는 `data-addfox-entry`로 Entry 스크립트를 표시해야 합니다

## 자동 발견과의 관계

- `entry`가 구성됨: `entry`에 선언된 Entry만 사용
- `entry`가 구성되지 않음: `app/` 디렉토리에서 Entry를 자동 발견
- 혼합 사용: `entry`에 구성된 Entry가 자동 발견된 동일 이름의 Entry를 덮어씁니다

## 예시

### 일부 Entry 덮어쓰기

```ts
export default defineConfig({
  entry: {
    // popup 경로 덮어쓰기
    popup: "pages/popup/main.tsx",
    // background와 content는 여전히 자동 발견
  },
});
```

### 완전한 구성

```ts
export default defineConfig({
  appDir: "src",
  entry: {
    background: "background/index.ts",
    content: "content/index.ts",
    popup: { src: "popup/index.tsx", html: true },
    options: { src: "options/index.tsx", html: "options/index.html" },
    capture: { src: "capture/index.tsx", html: true },
  },
});
```

## 관련 설정

- [`appDir`](/config/app-dir) - 애플리케이션 디렉토리
- [guide/entry/concept](/guide/entry/concept) - Entry 개념 상세 설명
- [guide/entry/file-based](/guide/entry/file-based) - 파일 기반 Entry 발견
- [guide/entry/config-based](/guide/entry/config-based) - 구성 기반 Entry
