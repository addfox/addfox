# Content-UI

Addfox는 `@addfox/utils`에 Content-UI 유틸리티 메서드를 내장하여 content script에서 직접 사용하는 것을 권장하며, 수동 마운트 프로세스를 작성하는 대신 사용하세요.

## 주입 위치

Content-UI는 **content Entry 파일**에서 주입해야 합니다 (예: `app/content/index.ts` 또는 `app/content/index.tsx`). popup/options/background에서 호출하지 마세요.

## 내장 메서드

### `defineContentUI(options)`

네이티브 컨테이너 모드로, 마운트 함수를 반환합니다.

```ts
// app/content/index.ts 또는 app/content/index.tsx
import { defineContentUI } from "@addfox/utils";

const mount = defineContentUI({
  tag: "div",
  target: "body",
  attr: { id: "addfox-content-ui-root" },
  injectMode: "append",
});

function mountUI() {
  const root = mount(); // Element
  root.textContent = "Hello Content-UI";
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mountUI);
} else {
  mountUI();
}
```

### `defineShadowContentUI(options)`

Shadow DOM 모드로, 스타일 분리에 적합합니다.

```ts
// app/content/index.ts
import { defineShadowContentUI } from "@addfox/utils";

const mount = defineShadowContentUI({
  name: "addfox-content-ui-root",
  target: "body",
  attr: { id: "addfox-content-ui-root" },
});

function mountUI() {
  const root = mount(); // ShadowRoot 내 mount 노드
  const title = document.createElement("div");
  title.textContent = "Content UI (addfox)";
  root.appendChild(title);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mountUI);
} else {
  mountUI();
}
```

### `defineIframeContentUI(options)`

iframe 모드로, 가장 높은 분리 수준을 제공합니다.

```ts
// app/content/index.ts
import { defineIframeContentUI } from "@addfox/utils";

const mount = defineIframeContentUI({
  target: "body",
  attr: { id: "addfox-content-ui-iframe" },
});

function mountUI() {
  const root = mount(); // iframe 문서의 루트 노드
  root.textContent = "Hello from iframe content-ui";
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mountUI);
} else {
  mountUI();
}
```

## 일반적인 파라미터

- `target`: 대상 마운트 위치 (CSS 선택자 또는 Element)
- `attr`: 주입 노드 속성 (`id`, `class`, `style`, `data-*` 등)
- `injectMode`: 주입 방식, `append | prepend`
- `tag`: `defineContentUI`에서만 필요
- `name`: `defineShadowContentUI`에서만 필요 (사용자 지정 요소 이름)

## 예시

- [addfox-with-content-ui](https://github.com/addfox/addfox/tree/main/examples/addfox-with-content-ui)  
  `defineShadowContentUI`를 사용하여 페이지 패널 주입
- [addfox-with-content-ui-react](https://github.com/addfox/addfox/tree/main/examples/addfox-with-content-ui-react)  
  `defineContentUI` + React + Tailwind 사용
