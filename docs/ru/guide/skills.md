---
name: addfox-skills
description: Документация по устанавливаемым Skill библиотекам Addfox. Эта страница соответствует текущему содержимому c:/programs/skills, включает команды установки, список skills и структуру директорий.
---

# Skills

Содержимое этой страницы соответствует текущему состоянию репозитория `c:/programs/skills`.

Этот репозиторий предоставляет устанавливаемые Skills для разработки расширений Addfox.

## Добавление и использование

Выполните в корневой директории проекта:

```bash
# Установить все skills из этого репозитория
npx skills add addmo-dev/skills

# Установить только указанные skills
npx skills add addmo-dev/skills --skill migrate-to-addfox
npx skills add addmo-dev/skills --skill addfox-best-practices
npx skills add addmo-dev/skills --skill extension-functions-best-practices
npx skills add addmo-dev/skills --skill addfox-debugging
npx skills add addmo-dev/skills --skill addfox-testing

# Сначала просмотреть доступные skills
npx skills add addmo-dev/skills --list
```

Также можно использовать полный GitHub URL:

```bash
npx skills add https://github.com/addmo-dev/skills
```

## Список Skills

| Skill | Назначение |
|-------|------|
| **migrate-to-addfox** | Миграция существующего проекта с WXT, Plasmo, Extension.js или решения без фреймворка на Addfox. |
| **addfox-best-practices** | Лучшие практики проектов Addfox: entry, конфигурация, manifest, разрешения, кросс-браузерность, фреймворки и стили, обмен сообщениями и т.д. |
| **extension-functions-best-practices** | Руководство по реализации функций расширений: видео/аудио/изображения/загрузки/AI/перевод/управление паролями/Web3 и другие сценарии возможностей. |
| **addfox-debugging** | Диагностика проблем сборки и выполнения Addfox: комбинация терминала, `.addfox/error.md`, `.addfox/meta.md` для позиционирования. |
| **addfox-testing** | Практики тестирования Addfox: выбор, конфигурация и реализация модульных и E2E тестов. |

## Структура репозитория

```tree
skills/
├── migrate-to-addfox/
│   ├── SKILL.md
│   └── references/
├── addfox-best-practices/
│   ├── SKILL.md
│   ├── reference.md
│   └── rules/
├── extension-functions-best-practices/
│   ├── SKILL.md
│   └── reference.md
├── addfox-debugging/
│   ├── SKILL.md
│   └── reference.md
└── addfox-testing/
    ├── SKILL.md
    └── reference.md
```

## Примечания

- После установки через `skills CLI` skills копируются в директорию skills проекта (например, `.cursor/skills/` или `.agents/skills/`).
- Можно сначала установить полностью, затем оставить часто используемые skills в соответствии с потребностями команды.
