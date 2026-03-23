# Концепция Entry

**Entry (точка входа)** соответствует различным функциональным модулям браузерного расширения, таким как фоновые скрипты, content scripts, всплывающие окна и т.д. Addfox предоставляет три способа конфигурации, которые можно использовать отдельно или в комбинации.

## Что такое entry

Браузерное расширение состоит из нескольких независимых функциональных модулей, каждый из которых требует файла entry:

| Тип entry | Соответствующее понятие расширения | Типичное применение |
|----------|-------------------|----------|
| `background` | Service Worker / фоновый скрипт | Обработка жизненного цикла расширения, межстраничная коммуникация |
| `content` | Content Script | Манипуляция DOM страницы, взаимодействие со страницей |
| `popup` | Всплывающее окно | Интерфейс, появляющийся после клика по иконке на панели инструментов |
| `options` | Страница настроек | Интерфейс настроек расширения |
| `sidepanel` | Боковая панель | Боковая панель Chrome |
| `devtools` | Инструменты разработчика | Пользовательская панель DevTools |
| `offscreen` | Offscreen документ | Фоновые задачи, требующие DOM API |

Для **`popup` / `options` / `sidepanel` / `devtools` / `offscreen`** — entry, требующих HTML: если **не предоставлен** пользовательский `index.html`, сборка **автоматически сгенерирует** страницу, содержащую **`<div id="root"></div>`**; **`<title>`** соответствует **`manifest.name`**; **иконка вкладки** через **`<link rel="icon">`** использует **`manifest.icons`**. При использовании пользовательского HTML шаблона необходимо самостоятельно написать title, иконку и точку монтирования (подробнее см. [Entry на основе файлов](/guide/entry/file-based)).

## Способы конфигурации

### Способ 1: На основе файлов (рекомендуется)

**Не настраивайте `entry`**, позвольте фреймворку автоматически обнаруживать entry по директориям и именам файлов.

```tree
app/
├── background/
│   └── index.ts      # → background entry
├── content/
│   └── index.ts      # → content entry
├── popup/
│   └── index.ts      # → popup entry
└── ...
```

Преимущества:
- Нулевая конфигурация, просто следуйте соглашениям
- Добавление нового entry требует только создания соответствующей директории
- Четкая структура кода

Подробнее см. [Entry на основе файлов](/guide/entry/file-based).

### Способ 2: На основе конфигурации (entry + manifest)

В `addfox.config.ts` настройте возможности, связанные с entry, через `entry` и `manifest`:

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

Преимущества:
- Централизованное управление entry и конфигурацией manifest
- Поддержка пользовательских имен entry
- Возможность переопределить результаты автообнаружения

Подробнее см. [Entry на основе конфигурации](/ru/guide/entry/config-based) и [конфигурацию manifest](/ru/config/manifest).

### Смешанное использование

Три способа можно комбинировать, приоритет следующий:

1. **Наивысший**: entry, настроенные в `config.entry`
2. **Второй**: пути к исходным файлам, указанные в manifest
3. **Третий**: автообнаружение

```ts
export default defineConfig({
  entry: {
    // Наивысший приоритет: переопределяет все другие источники
    popup: "pages/popup/main.ts",
  },
  manifest: {
    // Второй приоритет: используется, когда entry не указан
    background: { service_worker: "./background/index.ts" },
    // popup будет использовать конфигурацию из entry, а не эту
    action: { default_popup: "./popup/index.ts" },
  },
  // Третий приоритет: автообнаружение ненастроенных entry
});
```

## Основные принципы

### Entry должен быть JS/TS

Addfox основан на **Rsbuild**, реальные entry сборки могут быть только скриптовыми файлами `.js`, `.jsx`, `.ts`, `.tsx`.

### Обработка HTML

- **Entry не требующие HTML**: `background`, `content` требуют только скриптовые файлы
- **Entry требующие HTML**: `popup`, `options`, `sidepanel`, `devtools`, `offscreen`
  - Если HTML не предоставлен, Rsbuild автоматически генерирует его (содержит `<div id="root"></div>`)
  - Если предоставлен пользовательский HTML шаблон, необходимо указать entry скрипт через `data-addfox-entry`

### Пример: Пользовательский HTML шаблон

```html
<!-- app/popup/index.html -->
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>Всплывающее окно</title>
  </head>
  <body>
    <div id="root"></div>
    <!-- Указание entry через data-addfox-entry -->
    <script type="module" data-addfox-entry src="./index.ts"></script>
  </body>
</html>
```

## Встроенные и пользовательские entry

### Встроенные entry (зарезервированные имена)

Следующие имена имеют специальное значение и автоматически распознаются и обрабатываются Addfox:

| Имя entry | Описание |
|--------|------|
| `background` | Service Worker (MV3) или фоновая страница (MV2) |
| `content` | Content script |
| `popup` | Всплывающее окно панели инструментов |
| `options` | Страница настроек расширения |
| `sidepanel` | Боковая панель |
| `devtools` | Инструменты разработчика |
| `offscreen` | Offscreen документ |

:::warning
Имена встроенных entry нельзя изменять. Фреймворк зависит от этих имен для автоматического распознавания и заполнения путей в manifest.
:::

### Пользовательские entry

Помимо встроенных entry, в `entry` можно настроить любое имя как **пользовательский entry** (например, `capture`, `my-page`):

```ts
export default defineConfig({
  entry: {
    capture: { src: "capture/index.ts", html: true },
  },
});
```

Пользовательские entry создают независимые страницы, доступные по адресу `chrome-extension://<id>/capture/index.html`.

## Следующие шаги

- [Entry на основе файлов](/ru/guide/entry/file-based) — изучите правила соглашений для автообнаружения entry
- [Entry на основе конфигурации](/ru/guide/entry/config-based) — узнайте, как явно настроить entry + manifest
- [Конфигурация manifest](/ru/config/manifest) — настройка возможностей расширения в manifest
