# outDir

`outDir` используется для указания имени директории сборки.

## Обзор

- **Тип**: `string`
- **Значение по умолчанию**: `"extension"`
- **Обязательный**: Нет

## Использование

```ts
// addfox.config.ts
import { defineConfig } from "addfox";

export default defineConfig({
  outDir: "dist",  // Вывод в .addfox/dist/
});
```

## Полный путь вывода

Конечный путь вывода состоит из следующих частей:

```
{outputRoot}/{outDir}/
```

- `outputRoot`: фиксировано как `.addfox`
- `outDir`: по умолчанию `"extension"`, можно настроить

Полный путь по умолчанию: `.addfox/extension/`

## Примеры

### Изменение на dist

```ts
export default defineConfig({
  outDir: "dist",
});
```

Директория вывода: `.addfox/dist/`

### Структура артефактов сборки

```
.addfox/
├── dist/                   # Вывод сборки (outDir: "dist")
│   ├── manifest.json
│   ├── background/
│   │   └── index.js
│   ├── content/
│   │   └── index.js
│   └── popup/
│       ├── index.html
│       └── index.js
└── cache/                  # Кэш сборки
```

## Примечания

- `outDir` влияет только на имя директории вывода, родительская директория `.addfox` фиксирована
- После изменения `outDir` пути в manifest автоматически обновляются
- При разработке браузер загружает расширение из этой директории

## Связанная конфигурация

- [`zip`](/config/zip) — конфигурация упаковки
- [guide/output](/guide/output) — руководство по выводу
