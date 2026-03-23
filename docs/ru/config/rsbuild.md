# rsbuild

`rsbuild` используется для настройки или расширения конфигурации Rsbuild.

## Обзор

- **Тип**: `RsbuildConfig | ((base: RsbuildConfig, helpers: RsbuildConfigHelpers) => RsbuildConfig | Promise<RsbuildConfig>)`
- **Значение по умолчанию**: `undefined`
- **Обязательный**: Нет

## Способы конфигурации

### Объектная форма (глубокое слияние)

Объект конфигурации глубоко объединяется с конфигурацией по умолчанию:

```ts
// addfox.config.ts
import { defineConfig } from "addfox";

export default defineConfig({
  rsbuild: {
    source: {
      alias: {
        "@": "./app",
      },
    },
    output: {
      distPath: {
        root: "./dist",
      },
    },
  },
});
```

### Функциональная форма (полный контроль)

Функциональная форма получает конфигурацию по умолчанию и возвращает финальную конфигурацию:

```ts
// addfox.config.ts
import { defineConfig } from "addfox";

export default defineConfig({
  rsbuild: (base, helpers) => {
    // Использование helpers.merge для глубокого слияния
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

## Часто используемые конфигурации

### Псевдонимы путей

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

Использование в коде:

```ts
import { Button } from "@/components/Button";
import { formatDate } from "@/utils/date";
```

### Определение глобальных переменных

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

### Конфигурация CSS

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

### Конфигурация dev сервера

```ts
export default defineConfig({
  rsbuild: {
    server: {
      port: 3000,
    },
  },
});
```

## Полный пример конфигурации

```ts
import { defineConfig } from "addfox";
import { pluginReact } from "@rsbuild/plugin-react";

export default defineConfig({
  plugins: [pluginReact()],
  rsbuild: {
    source: {
      alias: {
        "@": "./app",
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
  },
});
```

## Примечания

- Объектная форма выполняет глубокое слияние
- Функциональная форма позволяет полностью контролировать конфигурацию, но требует самостоятельной обработки слияния
- Рекомендуется использовать `helpers.merge` для слияния, сохраняя конфигурацию по умолчанию фреймворка

## Связанные ссылки

- [Документация конфигурации Rsbuild](https://rsbuild.dev/config/)
- [Список плагинов Rsbuild](https://rsbuild.dev/plugins/list)

## Связанная конфигурация

- [`plugins`](/config/plugins) — конфигурация плагинов Rsbuild
