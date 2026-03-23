# Конфигурация Manifest

`manifest` используется для объявления манифеста (Manifest) браузерного расширения, то есть содержимого `manifest.json` в конечной директории вывода.

Поддерживаются три способа конфигурации:
- **Встроенный объект**: непосредственное написание содержимого manifest в конфигурации
- **Разделение по браузерам**: отдельная конфигурация manifest для Chrome и Firefox
- **Путь к файлу**: указание расположения файла manifest

Также можно **полностью опустить**, и фреймворк автоматически загрузит из директории исходного кода.

## Тип и поведение по умолчанию

- **Тип**: `ManifestConfig | ManifestPathConfig | undefined`
- **Поведение по умолчанию**: Без конфигурации фреймворк автоматически ищет в `appDir` или её поддиректории `manifest/`:
  - `manifest.json` — базовая конфигурация (один браузер или общая часть)
  - `manifest.chromium.json` — переопределение для Chrome
  - `manifest.firefox.json` — переопределение для Firefox

При сборке фреймворк объединяет в соответствии с целевым браузером, указанным в CLI (`-b chrome|firefox`), и выводит в `outputRoot/outDir/manifest.json`.

## Способы конфигурации

### 1. Единый объект (один браузер или общая конфигурация)

Все поля пишутся в одном объекте, фреймворк автоматически внедряет пути к entry.

```ts
// addfox.config.ts
import { defineConfig } from "addfox";

export default defineConfig({
  manifest: {
    name: "Моё расширение",
    version: "1.0.0",
    manifest_version: 3,
    permissions: ["storage", "activeTab"],
  },
});
```

Фреймворк автоматически генерирует и внедряет пути в соответствии с конфигурацией entry:
- `action.default_popup` → `popup/index.html`
- `background.service_worker` → `background/index.js`
- `content_scripts` → `content/index.js`

> Пути к entry (например, `popup/index.html`) автоматически вычисляются фреймворком на основе [entry](/ru/guide/entry/file-based) и [outDir](/ru/config/out-dir), вам достаточно поддерживать корректную семантику полей в manifest.

### 2. Разделение по браузерам (chromium / firefox)

Когда Chrome и Firefox требуют разной конфигурации manifest:

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
      permissions: ["storage"],
    },
    firefox: {
      name: "Моё расширение",
      version: "1.0.0",
      manifest_version: 3,
      action: { default_popup: "popup/index.html" },
      background: { service_worker: "background/index.js" },
      permissions: ["storage"],
    },
  },
});
```

При сборке выбирается соответствующая ветка в соответствии с CLI параметром:
- `addfox dev -b chrome` → используется ветка `chromium`
- `addfox dev -b firefox` → используется ветка `firefox`

### 3. Конфигурация пути (относительно appDir)

Сохранение manifest в отдельных JSON файлах:

```ts
// addfox.config.ts
export default defineConfig({
  manifest: {
    chromium: "manifest/manifest.chromium.json",
    firefox: "manifest/manifest.firefox.json",
  },
});
```

Путь к файлу относительно [`appDir`](/ru/config/app-dir).

### 4. Полностью опустить (автоматическая загрузка)

Без конфигурации `manifest` фреймворк ищет в следующем порядке:

1. `appDir/manifest.json`
2. `appDir/manifest/manifest.json`
3. `appDir/manifest/manifest.chromium.json`
4. `appDir/manifest/manifest.firefox.json`

**Рекомендуемая структура файлов**:

```
app/
├── manifest/
│   ├── manifest.json           # Базовая конфигурация
│   ├── manifest.chromium.json  # Переопределение Chrome
│   └── manifest.firefox.json   # Переопределение Firefox
├── background/
├── content/
└── popup/
```

## Полный пример

### Конфигурация поддержки двух браузеров

```ts
// addfox.config.ts
import { defineConfig } from "addfox";

export default defineConfig({
  manifest: {
    chromium: {
      name: "Менеджер вкладок",
      version: "1.0.0",
      description: "Эффективное управление вкладками браузера",
      manifest_version: 3,
      permissions: ["tabs", "storage"],
      icons: {
        16: "icons/icon16.png",
        48: "icons/icon48.png",
        128: "icons/icon128.png",
      },
      action: {
        default_popup: "popup/index.html",
        default_icon: {
          16: "icons/icon16.png",
        },
      },
      background: {
        service_worker: "background/index.js",
      },
      content_scripts: [
        {
          matches: ["<all_urls>"],
          js: ["content/index.js"],
          run_at: "document_end",
        },
      ],
    },
    
    firefox: {
      name: "Менеджер вкладок",
      version: "1.0.0",
      description: "Эффективное управление вкладками браузера",
      manifest_version: 3,
      permissions: ["tabs", "storage"],
      icons: {
        16: "icons/icon16.png",
        48: "icons/icon48.png",
        128: "icons/icon128.png",
      },
      action: {
        default_popup: "popup/index.html",
        default_icon: {
          16: "icons/icon16.png",
        },
      },
      background: {
        service_worker: "background/index.js",
      },
      content_scripts: [
        {
          matches: ["<all_urls>"],
          js: ["content/index.js"],
          run_at: "document_end",
        },
      ],
    },
  },
});
```

## Связанная конфигурация

- [entry](/ru/guide/entry/file-based) — правила автообнаружения entry
- [appDir](/ru/config/app-dir) — конфигурация директории приложения
- [outDir](/ru/config/out-dir) — конфигурация директории вывода
