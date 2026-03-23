# Переменные окружения

Addfox использует `loadEnv` из Rsbuild для загрузки файлов `.env` из корневой директории проекта и по умолчанию экспонирует в клиентский код только переменные, начинающиеся с `ADDFOX_PUBLIC_`.

## Поведение по умолчанию

- **Префикс по умолчанию**: `ADDFOX_PUBLIC_`
- **Клиентский код**: background, content, popup, options, sidepanel, devtools и другие entry
- **Загружаемые файлы**: `.env`, `.env.local`, `.env.{mode}`, `.env.{mode}.local`

## Область действия

Переменные окружения внедряются во все **клиентские** entry, но **не** работают в конфигурации `manifest` в `addfox.config.ts` (там используется окружение времени сборки).

## Встроенные переменные

Addfox автоматически внедряет следующие переменные:

| Имя переменной | Описание |
|--------|------|
| `process.env.BROWSER` | Целевой браузер сборки |
| `process.env.NODE_ENV` | Текущий режим |
| `process.env.ADDFOX_VERSION` | Версия Addfox |

## Примеры использования

### Файл .env

```bash
ADDFOX_PUBLIC_API_URL=https://api.example.com
ADDFOX_PUBLIC_APP_NAME=My Extension
ADDFOX_PRIVATE_KEY=secret  # Не будет экспонирован клиенту
```

### Использование в коде

```ts
// app/popup/index.tsx
const apiUrl = process.env.ADDFOX_PUBLIC_API_URL;
```

## Рекомендации по безопасности

- Всегда используйте префикс `ADDFOX_PUBLIC_` для переменных, которые можно экспонировать клиенту
- Чувствительная информация (например, API ключи) не должна начинаться с `ADDFOX_PUBLIC_`
- Файлы `.env.local` и `.env.{mode}.local` не должны коммититься в Git

## Связанная документация

- [guide/env-prefix](/guide/env-prefix) — руководство по использованию переменных окружения
