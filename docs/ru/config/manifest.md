# manifest

`manifest` используется для объявления манифеста (Manifest) браузерного расширения, то есть содержимого `manifest.json` в конечной директории сборки.

## Обзор

- **Тип**: `ManifestConfig | ManifestPathConfig | undefined`
- **Значение по умолчанию**: `undefined` (автоматическая загрузка)
- **Обязательный**: Нет

## Способы конфигурации

### 1. Встроенный объект (один браузер)

Простейший способ конфигурации, подходит для поддержки одного браузера или когда конфигурация для разных браузеров одинакова.

```ts
// addfox.config.ts
import { defineConfig } from "addfox";

export default defineConfig({
  manifest: {
    name: "Моё расширение",
    version: "1.0.0",
    manifest_version: 3,
    permissions: ["storage", "activeTab"],
    action: { default_popup: "popup/index.html" },
    background: { service_worker: "background/index.js" },
    content_scripts: [
      { matches: ["<all_urls>"], js: ["content/index.js"] },
    ],
  },
});
```

### 2. Разделение по браузерам (chromium / firefox)

Используется, когда Chrome и Firefox требуют разной конфигурации.

```ts
// addfox.config.ts
export default defineConfig({
  manifest: {
    chromium: {
      name: "Моё расширение",
      version: "1.0.0",
      manifest_version: 3,
      action: { default_popup: "popup/index.html" },
      background: { service_worker: "background/index.js" },
    },
    
    firefox: {
      name: "Моё расширение",
      version: "1.0.0",
      manifest_version: 3,
      action: { default_popup: "popup/index.html" },
      background: { service_worker: "background/index.js" },
    },
  },
});
```

### 3. Конфигурация пути к файлу

Сохранение manifest в отдельном JSON файле.

```ts
// addfox.config.ts
export default defineConfig({
  manifest: {
    chromium: "manifest/manifest.chromium.json",
    firefox: "manifest/manifest.firefox.json",
  },
});
```

Путь относительно [`appDir`](/config/app-dir).

### 4. Автоматическая загрузка (рекомендуется)

Без конфигурации `manifest` фреймворк автоматически ищет:

1. `appDir/manifest.json`, `appDir/manifest.chromium.json`, `appDir/manifest.firefox.json`
2. `appDir/manifest/manifest.json`, `appDir/manifest/manifest.chromium.json`, `appDir/manifest/manifest.firefox.json`

Любой найденный файл будет использоваться как основа и объединяться с файлами chromium/firefox из той же директории.

## Прямое указание исходных файлов entry в Manifest

Начиная с addfox 1.x, вы можете напрямую указывать **пути к исходным файлам** entry в manifest, фреймворк автоматически распознает и соберёт их, заменяя пути на пути к артефактам сборки.

```ts
// addfox.config.ts
export default defineConfig({
  manifest: {
    name: "Моё расширение",
    version: "1.0.0",
    manifest_version: 3,
    
    // Прямое указание путей к исходным файлам в manifest
    background: {
      service_worker: "./background/index.ts",  // Путь к исходному файлу
    },
    action: {
      default_popup: "./popup/index.tsx",       // Путь к исходному файлу
    },
    content_scripts: [
      {
        matches: ["<all_urls>"],
        js: ["./content/index.ts"],              // Путь к исходному файлу
      },
    ],
  },
});
```

Фреймворк будет:
1. Распознавать пути к исходным файлам (`.ts`, `.tsx`, `.js`, `.jsx`)
2. Автоматически обрабатывать их как entry
3. Заменять пути на пути к артефактам (например, `background/index.js`)

### Поддерживаемые поля entry

Вы можете использовать пути к исходным файлам в следующих полях manifest:

| Поле | Описание |
|------|------|
| `background.service_worker` | Фоновый скрипт MV3 |
| `background.scripts` | Фоновые скрипты MV2 |
| `background.page` | Фоновая страница |
| `action.default_popup` | Всплывающее окно MV3 |
| `browser_action.default_popup` | Всплывающее окно MV2 |
| `options_ui.page` / `options_page` | Страница настроек |
| `devtools_page` | Страница инструментов разработчика |
| `side_panel.default_path` | Боковая панель |
| `sandbox.pages` | Песочница |
| `chrome_url_overrides.newtab` | Новая вкладка |
| `chrome_url_overrides.bookmarks` | Страница закладок |
| `chrome_url_overrides.history` | Страница истории |
| `content_scripts[].js` | Content scripts |

### Приоритет разрешения entry

Приоритет разрешения entry фреймворком:

1. **Наивысший**: entry, явно указанные в `config.entry`
2. **Второй**: пути к исходным файлам в manifest
3. **Третий**: автообнаружение (на основе соглашений)

Это означает:
- Если вы указали entry в `config.entry`, пути к исходным файлам в manifest игнорируются
- Если `config.entry` не настроен, но в manifest есть пути к исходным файлам, фреймворк использует их
- Если ни то, ни другое не указано, фреймворк автоматически обнаруживает entry по соглашениям

```ts
// Пример: config.entry имеет наивысший приоритет
export default defineConfig({
  entry: {
    // Эта конфигурация переопределит путь к исходному файлу background в manifest
    background: "custom-background/index.ts",
  },
  manifest: {
    background: {
      service_worker: "./background/index.ts",  // Будет переопределен config.entry
    },
  },
});
```

## Определения типов

```ts
type ManifestConfig = 
  | Record<string, unknown>           // Единый объект
  | { chromium?: Record<string, unknown>; firefox?: Record<string, unknown> };  // Разделение

type ManifestPathConfig = {
  chromium?: string;   // Путь относительно appDir
  firefox?: string;    // Путь относительно appDir
};
```

## Примечания

1. Пути к entry (например, `popup/index.html`) автоматически вычисляются фреймворком на основе [`entry`](/config/entry) и [`outDir`](/config/out-dir)
2. Используйте CLI `-b chrome|firefox` для выбора соответствующей ветки сборки
3. Фреймворк автоматически внедряет пути к entry в поля `background`, `content_scripts`, `action` и т.д. в manifest
4. При использовании путей к исходным файлам в manifest убедитесь, что файлы существуют, иначе сборка завершится ошибкой

## Примеры

### Поддержка двух браузеров

```ts
export default defineConfig({
  manifest: {
    chromium: {
      name: "Менеджер вкладок",
      version: "1.0.0",
      manifest_version: 3,
      permissions: ["tabs", "storage"],
      action: { default_popup: "popup/index.html" },
      background: { service_worker: "background/index.js" },
      content_scripts: [
        { matches: ["<all_urls>"], js: ["content/index.js"] },
      ],
    },
    
    firefox: {
      name: "Менеджер вкладок",
      version: "1.0.0",
      manifest_version: 3,
      permissions: ["tabs", "storage"],
      action: { default_popup: "popup/index.html" },
      background: { service_worker: "background/index.js" },
      content_scripts: [
        { matches: ["<all_urls>"], js: ["content/index.js"] },
      ],
    },
  },
});
```

### Конфигурация entry только через Manifest (без config.entry)

```ts
export default defineConfig({
  // Не конфигурируем entry, полностью полагаемся на пути к исходным файлам в manifest
  manifest: {
    name: "Пример чистой Manifest конфигурации",
    version: "1.0.0",
    manifest_version: 3,
    background: {
      service_worker: "./src/background.ts",
    },
    action: {
      default_popup: "./src/popup.tsx",
    },
    content_scripts: [
      {
        matches: ["<all_urls>"],
        js: ["./src/content.ts"],
      },
    ],
  },
});
```

## Связанная конфигурация

- [`entry`](/config/entry) — конфигурация entry
- [`appDir`](/config/app-dir) — директория приложения
- [`outDir`](/config/out-dir) — директория вывода
