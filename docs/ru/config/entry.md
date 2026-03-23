# entry

`entry` используется для настройки сопоставления entry расширения. Без конфигурации фреймворк автоматически обнаруживает entry из директории приложения.

## Обзор

- **Тип**: `Record<string, EntryConfigValue> | undefined`
- **Значение по умолчанию**: `undefined` (автообнаружение)
- **Обязательный**: Нет

```ts
type EntryConfigValue = 
  | string                           // Путь к скрипту
  | { src: string; html?: boolean | string };  // Объектная форма
```

## Зарезервированные имена entry

Следующие имена имеют специальное значение и соответствуют стандартным entry браузерного расширения:

| Имя entry | Тип | Описание |
|--------|------|------|
| `background` | Только скрипт | Service Worker / фоновый скрипт |
| `content` | Только скрипт | Content Script |
| `popup` | Скрипт + HTML | Всплывающее окно |
| `options` | Скрипт + HTML | Страница настроек |
| `sidepanel` | Скрипт + HTML | Боковая панель |
| `devtools` | Скрипт + HTML | Страница инструментов разработчика |
| `offscreen` | Скрипт + HTML | Offscreen документ |

## Способы конфигурации

### Строковая форма

Значение — это путь к скрипту относительно baseDir (по умолчанию `app/`).

```ts
export default defineConfig({
  entry: {
    background: "background/index.ts",
    content: "content/index.ts",
    popup: "popup/index.tsx",
  },
});
```

### Объектная форма

Более детальный контроль:

```ts
export default defineConfig({
  entry: {
    // Автоматическая генерация HTML
    popup: { src: "popup/index.tsx", html: true },
    
    // Использование пользовательского HTML шаблона
    options: { src: "options/index.tsx", html: "options/template.html" },
    
    // Только скрипт (без генерации HTML)
    worker: { src: "worker/index.ts", html: false },
  },
});
```

### Пользовательские entry

Помимо зарезервированных имен, можно добавить любое имя как пользовательский entry:

```ts
export default defineConfig({
  entry: {
    // Встроенные entry
    background: "background/index.ts",
    popup: "popup/index.tsx",
    
    // Пользовательские entry
    capture: { src: "pages/capture/index.tsx", html: true },
    welcome: { src: "pages/welcome/index.tsx", html: true },
  },
});
```

Пользовательские entry создают независимые страницы, доступные по адресу `chrome-extension://<id>/capture/index.html`.

## Правила путей

- Все пути **относительно baseDir** (определяется [`appDir`](/config/app-dir), по умолчанию `app/`)
- Entry должны быть скриптами с расширением `.js`, `.jsx`, `.ts`, `.tsx`
- При использовании пользовательского HTML шаблона необходимо указать entry скрипт через `data-addfox-entry`

## Взаимодействие с автообнаружением

- При наличии конфигурации `entry`: используются только entry, объявленные в `entry`
- Без конфигурации `entry`: entry автоматически обнаруживаются в директории `app/`
- Смешанное использование: entry из `entry` переопределяют одноименные автоматически обнаруженные entry

## Примеры

### Переопределение части entry

```ts
export default defineConfig({
  entry: {
    // Переопределить путь popup
    popup: "pages/popup/main.tsx",
    // background и content остаются автообнаруженными
  },
});
```

### Полная конфигурация

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

## Связанная конфигурация

- [`appDir`](/config/app-dir) — директория приложения
- [guide/entry/concept](/guide/entry/concept) — подробное объяснение концепции entry
- [guide/entry/file-based](/guide/entry/file-based) — entry на основе файлов
- [guide/entry/config-based](/guide/entry/config-based) — entry на основе конфигурации
