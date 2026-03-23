# Иконки

Браузерное расширение требует набор иконок для панели инструментов, страницы управления расширениями и Web Store.

## Размеры иконок

Рекомендуемые размеры для Chrome расширений:

| Размер | Назначение |
|------|------|
| 16x16 | Иконка панели инструментов (Favicon) |
| 32x32 | Иконка панели инструментов (Retina) |
| 48x48 | Страница управления расширениями |
| 128x128 | Web Store и подсказка при установке |

Firefox дополнительно поддерживает:

| Размер | Назначение |
|------|------|
| 19x19 | Иконка панели инструментов |
| 38x38 | Иконка панели инструментов (Retina) |
| 96x96 | Страница управления расширениями |

## Структура директорий

Разместите иконки в `public/icons/`:

```tree
public/
└── icons/
    ├── icon16.png
    ├── icon32.png
    ├── icon48.png
    └── icon128.png
```

## Конфигурация в Manifest

```json
{
  "icons": {
    "16": "icons/icon16.png",
    "32": "icons/icon32.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  },
  "action": {
    "default_icon": {
      "16": "icons/icon16.png",
      "32": "icons/icon32.png"
    }
  }
}
```

## Динамическая установка иконки

В коде можно динамически изменять иконку:

```ts
// Установка иконки панели инструментов
chrome.action.setIcon({
  path: {
    16: "icons/icon-active16.png",
    32: "icons/icon-active32.png",
  },
});

// Установка заголовка
chrome.action.setTitle({ title: "Active Mode" });

// Установка бейджа
chrome.action.setBadgeText({ text: "3" });
chrome.action.setBadgeBackgroundColor({ color: "#FF0000" });
```

## Адаптация к тёмному режиму

Предоставление разных иконок для разных тем:

```ts
// Определение системной темы и установка соответствующей иконки
if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
  chrome.action.setIcon({
    path: {
      16: "icons/icon-dark16.png",
      32: "icons/icon-dark32.png",
    },
  });
}
```

## Рекомендации по дизайну иконок

1. **Простота и четкость** — различимость при малых размерах
2. **Согласованность бренда** — связь с функцией расширения или брендом
3. **Высокий контраст** — четкость на разных фонах
4. **Избегайте текста** — текст плохо различим при малых размерах
5. **Используйте PNG** — поддержка прозрачного фона

## SVG иконки

Chrome также поддерживает SVG иконки:

```json
{
  "icons": {
    "16": "icons/icon16.svg",
    "32": "icons/icon32.svg"
  }
}
```

Но в некоторых сценариях (например, Web Store) по-прежнему требуется PNG, рекомендуется предоставлять оба формата.

## Инструменты для генерации иконок

- [Figma](https://figma.com/) — Дизайн иконок и экспорт в разные размеры
- [Icon Kitchen](https://icon.kitchen/) — Онлайн генератор иконок расширений
- [RealFaviconGenerator](https://realfavicongenerator.net/) — Генератор иконок в разных размерах

## Полный пример

```ts
// addfox.config.ts
export default defineConfig({
  manifest: {
    name: "Моё расширение",
    icons: {
      16: "icons/icon16.png",
      32: "icons/icon32.png",
      48: "icons/icon48.png",
      128: "icons/icon128.png",
    },
    action: {
      default_icon: {
        16: "icons/icon16.png",
        32: "icons/icon32.png",
      },
    },
  },
});
```

## Связанные ссылки

- [Спецификация иконок Chrome](https://developer.chrome.com/docs/extensions/mv3/user_interface/#icons)
- [Требования к иконкам Chrome Web Store](https://developer.chrome.com/docs/webstore/images/#icons)
