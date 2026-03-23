# plugins

`plugins` используется для настройки плагинов Rsbuild.

## Обзор

- **Тип**: `RsbuildPlugin[]`
- **Значение по умолчанию**: `undefined`
- **Обязательный**: Нет

## Использование

```ts
// addfox.config.ts
import { defineConfig } from "addfox";
import { pluginReact } from "@rsbuild/plugin-react";
import { pluginVue } from "@addfox/rsbuild-plugin-vue";

export default defineConfig({
  plugins: [
    pluginReact(),
    // или pluginVue(),
  ],
});
```

## Плагины фреймворков

### React

```bash
npm install @rsbuild/plugin-react
```

```ts
import { pluginReact } from "@rsbuild/plugin-react";

export default defineConfig({
  plugins: [pluginReact()],
});
```

### Vue

```bash
npm install @addfox/rsbuild-plugin-vue
```

```ts
import { pluginVue } from "@addfox/rsbuild-plugin-vue";

export default defineConfig({
  plugins: [pluginVue()],
});
```

### Другие фреймворки

- **Preact**: `@rsbuild/plugin-preact`
- **Svelte**: `@rsbuild/plugin-svelte`
- **Solid**: `@rsbuild/plugin-solid`

## Другие часто используемые плагины

### Проверка типов TypeScript

```ts
import { pluginTypeCheck } from "@rsbuild/plugin-type-check";

export default defineConfig({
  plugins: [pluginTypeCheck()],
});
```

### Обработка SVG

```ts
import { pluginSvgr } from "@rsbuild/plugin-svgr";

export default defineConfig({
  plugins: [
    pluginSvgr({
      svgrOptions: {
        exportType: "default",
      },
    }),
  ],
});
```

## Встроенные плагины

Следующие плагины автоматически внедряются Addfox, ручная конфигурация не требуется:

| Плагин | Назначение |
|------|------|
| `plugin-extension-entry` | Обработка entry расширения и генерация HTML |
| `plugin-extension-manifest` | Обработка генерации manifest и внедрения путей |
| `plugin-extension-hmr` | Горячая перезагрузка при разработке (только dev режим) |
| `plugin-extension-monitor` | Мониторинг ошибок (dev + debug режим) |

## Примечания

- Массив плагинов передается в Rsbuild
- Плагины выполняются в порядке массива
- Плагины фреймворков автоматически обрабатывают специфическую для расширений логику

## Связанная конфигурация

- [`rsbuild`](/config/rsbuild) — конфигурация Rsbuild
- [Список плагинов Rsbuild](https://rsbuild.dev/plugins/list)
