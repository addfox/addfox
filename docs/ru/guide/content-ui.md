# Content-UI

Addfox включает в `@addfox/utils` методы Content-UI, рекомендуется использовать их напрямую в content script вместо ручного написания процесса монтирования.

## Место внедрения

Content-UI необходимо внедрять в **entry файл content** (например, `app/content/index.ts` или `app/content/index.tsx`), а не вызывать в popup/options/background.

## Встроенные методы

### `defineContentUI(options)`

Режим нативного контейнера, возвращает функцию монтирования.

```ts
// app/content/index.ts или app/content/index.tsx
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

Режим Shadow DOM, подходит для изоляции стилей.

```ts
// app/content/index.ts
import { defineShadowContentUI } from "@addfox/utils";

const mount = defineShadowContentUI({
  name: "addfox-content-ui-root",
  target: "body",
  attr: { id: "addfox-content-ui-root" },
});

function mountUI() {
  const root = mount(); // Узел монтирования внутри ShadowRoot
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

Режим iframe, наивысший уровень изоляции.

```ts
// app/content/index.ts
import { defineIframeContentUI } from "@addfox/utils";

const mount = defineIframeContentUI({
  target: "body",
  attr: { id: "addfox-content-ui-iframe" },
});

function mountUI() {
  const root = mount(); // Корневой узел в документе iframe
  root.textContent = "Hello from iframe content-ui";
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mountUI);
} else {
  mountUI();
}
```

## Часто используемые параметры

- `target`: Целевая позиция монтирования (CSS селектор или Element)
- `attr`: Атрибуты внедряемого узла (`id`, `class`, `style`, `data-*` и т.д.)
- `injectMode`: Способ внедрения, `append | prepend`
- `tag`: Требуется только для `defineContentUI`
- `name`: Требуется только для `defineShadowContentUI` (имя пользовательского элемента)

## Примеры

- [addfox-with-content-ui](https://github.com/addfox/addfox/tree/main/examples/addfox-with-content-ui)  
  Использование `defineShadowContentUI` для внедрения панели на страницу
- [addfox-with-content-ui-react](https://github.com/addfox/addfox/tree/main/examples/addfox-with-content-ui-react)  
  Использование `defineContentUI` + React + Tailwind
