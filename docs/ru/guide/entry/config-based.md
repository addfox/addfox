# Entry на основе конфигурации

В `addfox.config.ts` через `entry` и `manifest` можно:
- Настраивать пользовательские пути entry
- Переопределять результаты автообнаружения
- Добавлять **пользовательские entry** (такие как `capture`, `my-page` и т.д.)

Entry, не перечисленные в `entry`, по-прежнему автоматически обнаруживаются по [правилам на основе файлов](/guide/entry/file-based).

## Основные принципы

Как и entry на основе файлов:
- **Entry должен быть JS/TS**: сборка основана на Rsbuild, реальные entry могут быть только скриптовыми файлами
- **Обработка HTML**: встроенные HTML entry (popup/options и т.д.) автоматически генерируются; при использовании пользовательского HTML шаблона необходимо указать entry скрипт через `data-addfox-entry`
- **При автоматической генерации HTML** (без пользовательского шаблона): страница содержит **`<div id="root"></div>`**; **`<title>`** использует **`manifest.name`**; **favicon** через **`<link rel="icon">`** использует пути из **`manifest.icons`**. При использовании пользовательского `index.html` эти два элемента автоматически не внедряются и должны быть написаны вручную.

## Способы конфигурации

### 1) Настройка entry через `entry`

`entry` — это объект: **ключ = имя entry, значение = путь или объект конфигурации**.

### 2) Настройка возможностей entry через `manifest`

В `manifest` можно объявлять поля, связанные с возможностями entry (такие как `background`, `action.default_popup`, `content_scripts`):

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

### 3) Приоритет `entry` и `manifest`

При одновременном участии в разрешении entry приоритет следующий:

1. Явно настроенные в `entry`
2. Поля, связанные с entry, в `manifest`
3. Автообнаружение (на основе файлов)

То есть: `entry` переопределяет одноименные entry из других источников.

### Строковый путь (рекомендуется)

Значение — это путь **относительно baseDir** (по умолчанию `app/`):

| Тип значения | Значение | Пример |
|--------|------|------|
| Путь к скрипту `.ts/.tsx` | Использовать этот скрипт как entry; встроенные HTML entry автоматически генерируют HTML или используют `index.html` из той же директории как шаблон | `"popup/index.ts"` |
| Путь к HTML `.html` | Использовать этот HTML как шаблон; entry скрипт должен быть указан через `data-addfox-entry` | `"popup/index.html"` |

### Объектная форма: `{ src, html? }`

Более детальный контроль:

| Поле | Тип | Описание |
|------|------|------|
| `src` | `string` | Путь к entry скрипту (относительно baseDir) **обязательно** |
| `html` | `boolean \| string` | `true`: генерировать HTML без шаблона; `false`: только скрипт; `string`: указать путь к HTML шаблону |

## Встроенные entry и пути вывода

При настройке встроенных entry через `entry` пути вывода по умолчанию следующие:

| Имя entry | Тип | Выходной скрипт | Выходной HTML |
|--------|------|----------|-----------|
| `background` | Только скрипт | `background/index.js` | — |
| `content` | Только скрипт | `content/index.js` | — |
| `popup` | Скрипт+HTML | `popup/index.js` | `popup/index.html` |
| `options` | Скрипт+HTML | `options/index.js` | `options/index.html` |
| `sidepanel` | Скрипт+HTML | `sidepanel/index.js` | `sidepanel/index.html` |
| `devtools` | Скрипт+HTML | `devtools/index.js` | `devtools/index.html` |
| `offscreen` | Скрипт+HTML | `offscreen/index.js` | `offscreen/index.html` |

:::info
В manifest фреймворк автоматически заполняет поля `action.default_popup`, `options_page` и т.д. указанными выше путями.
:::

## Примеры конфигурации

### Переопределение части entry

```ts
// addfox.config.ts
import { defineConfig } from "addfox";

export default defineConfig({
  entry: {
    // Переопределить только эти entry, остальные автообнаруживаются
    popup: "popup/main.tsx",
    options: "options/settings.tsx",
  },
});
```

### Полная конфигурация всех entry

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

### Пользовательский entry + принудительная генерация HTML

```ts
export default defineConfig({
  entry: {
    // Встроенные entry
    background: "background/index.ts",
    content: "content/index.ts",
    popup: "popup/index.tsx",
    
    // Пользовательские entry страниц (автоматическая генерация HTML)
    capture: { src: "pages/capture/index.tsx", html: true },
    
    // Пользовательские entry страниц (использование шаблона)
    welcome: { src: "pages/welcome/index.tsx", html: "pages/welcome/template.html" },
    
    // Только скрипт (без HTML)
    worker: { src: "worker/index.ts", html: false },
  },
});
```

### Отключение автообнаружения entry

Если требуется полностью ручное управление всеми entry:

```ts
export default defineConfig({
  entry: {
    background: "background/index.ts",
    content: "content/index.ts",
    popup: "popup/index.tsx",
    // ... перечислите все необходимые entry
  },
  // Ненастроенные entry остаются неопределенными, фреймворк обрабатывает только перечисленные в entry
});
```

## Правила разрешения путей

### Относительно baseDir

Все пути в `entry` **относительны baseDir**, baseDir определяется [`appDir`](/config/app-dir) (по умолчанию `app`):

```ts
export default defineConfig({
  appDir: "src",                    // baseDir = src/
  entry: {
    popup: "popup/index.ts",        // указывает на src/popup/index.ts
  },
});
```

### Таблица быстрого поиска путей

| Способ конфигурации | Расположение entry скрипта | Типичный вывод |
|----------|--------------|----------|
| `background: "background/index.ts"` | `app/background/index.ts` | `extension/background/index.js` |
| `content: "content.ts"` | `app/content.ts` | `extension/content.js` |
| `popup: "popup/index.ts"` | `app/popup/index.ts` | `extension/popup/index.html` + `extension/popup/index.js` |
| `capture: { src: "capture/index.ts", html: true }` | `app/capture/index.ts` | `extension/capture/index.html` + `extension/capture/index.js` |

## Следующие шаги

- [Entry на основе файлов](/ru/guide/entry/file-based) — изучите правила автообнаружения
- [Конфигурация appDir](/ru/config/app-dir) — изменение директории исходного кода
- [Конфигурация manifest](/ru/config/manifest) — конфигурация manifest расширения
