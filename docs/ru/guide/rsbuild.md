# Конфигурация Rsbuild

Addfox основан на [Rsbuild](https://rsbuild.dev/), вы можете полностью настроить конфигурацию сборки.

## Способы конфигурации

Используйте поле `rsbuild` в `addfox.config.ts`:

```ts
// addfox.config.ts
import { defineConfig } from "addfox";

export default defineConfig({
  rsbuild: {
    // Ваша конфигурация Rsbuild
  },
});
```

## Часто используемые конфигурации

### Псевдонимы путей

Упрощение импорта модулей:

```ts
export default defineConfig({
  rsbuild: {
    source: {
      alias: {
        "@": "./app",
        "@/components": "./app/components",
        "@/utils": "./app/utils",
      },
    },
  },
});
```

Использование:

```ts
import { Button } from "@/components/Button";
import { formatDate } from "@/utils/date";
```

### Определение глобальных переменных

Внедрение глобальных констант на этапе компиляции:

```ts
export default defineConfig({
  rsbuild: {
    source: {
      define: {
        __VERSION__: JSON.stringify(process.env.npm_package_version),
        __DEV__: JSON.stringify(process.env.NODE_ENV === "development"),
      },
    },
  },
});
```

Использование в коде:

```ts
console.log(__VERSION__);  // "1.0.0"
console.log(__DEV__);      // true / false
```

### Конфигурация CSS

#### CSS Modules

```ts
export default defineConfig({
  rsbuild: {
    css: {
      modules: {
        localIdentName: "[local]--[hash:base64:5]",
      },
    },
  },
});
```

#### Sass

Установка плагина:

```bash
pnpm add -D @rsbuild/plugin-sass sass
```

Конфигурация:

```ts
import { pluginSass } from "@rsbuild/plugin-sass";

export default defineConfig({
  plugins: [pluginSass()],
});
```

Подробнее см. [Руководство по интеграции Sass](/guide/style-integration/sass).

#### Less

Установка плагина:

```bash
pnpm add -D @rsbuild/plugin-less less
```

Конфигурация:

```ts
import { pluginLess } from "@rsbuild/plugin-less";

export default defineConfig({
  plugins: [pluginLess()],
});
```

Подробнее см. [Руководство по интеграции Less](/guide/style-integration/less).

#### Tailwind CSS

Подробнее см. [Руководство по интеграции Tailwind CSS](/guide/style-integration/tailwindcss).

### Оптимизация сборки

#### Разделение кода

```ts
export default defineConfig({
  rsbuild: {
    performance: {
      chunkSplit: {
        strategy: "split-by-experience",
      },
    },
  },
});
```

#### Встраивание ресурсов

```ts
export default defineConfig({
  rsbuild: {
    output: {
      dataUriLimit: {
        svg: 4096,      // Встраивание SVG менее 4KB
        font: 4096,     // Встраивание шрифтов менее 4KB
      },
    },
  },
});
```

## Функциональная форма конфигурации

Используется при необходимости полного контроля конфигурации:

```ts
export default defineConfig({
  rsbuild: (base, helpers) => {
    // base: конфигурация по умолчанию
    // helpers.merge: инструмент глубокого слияния
    
    return helpers.merge(base, {
      source: {
        alias: {
          "@": "./app",
        },
      },
    });
  },
});
```

## Добавление плагинов

```ts
import { pluginReact } from "@rsbuild/plugin-react";
import { pluginSvgr } from "@rsbuild/plugin-svgr";

export default defineConfig({
  plugins: [
    pluginReact(),
    pluginSvgr(),
  ],
});
```

## Полный пример

```ts
import { defineConfig } from "addfox";
import { pluginReact } from "@rsbuild/plugin-react";

export default defineConfig({
  manifest: {
    name: "Моё расширение",
    version: "1.0.0",
    manifest_version: 3,
  },
  
  plugins: [pluginReact()],
  
  rsbuild: {
    source: {
      alias: {
        "@": "./app",
        "@/components": "./app/components",
      },
      define: {
        __VERSION__: JSON.stringify("1.0.0"),
      },
    },
    
    output: {
      polyfill: "usage",
    },
    
    performance: {
      chunkSplit: {
        strategy: "split-by-experience",
      },
    },
    
    tools: {
      // Пользовательская конфигурация инструментов
    },
  },
});
```

## Примечания

- Конфигурация глубоко объединяется с конфигурацией по умолчанию Addfox
- Функциональная форма позволяет полностью контролировать конфигурацию, но требует самостоятельной обработки слияния
- Рекомендуется использовать `helpers.merge` для сохранения конфигурации по умолчанию

## Связанные ссылки

- [Документация конфигурации Rsbuild](https://rsbuild.dev/config/)
- [Список плагинов Rsbuild](https://rsbuild.dev/plugins/list)

## Связанная конфигурация

- [`plugins`](/config/plugins) — конфигурация плагинов Rsbuild
