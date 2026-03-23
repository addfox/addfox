# Переменные окружения

Addfox поддерживает управление переменными окружения через файлы `.env`, которые можно безопасно использовать в клиентском коде.

## Базовое использование

Создайте файл `.env` в корне проекта:

```bash
# .env
ADDFOX_PUBLIC_API_URL=https://api.example.com
ADDFOX_PUBLIC_APP_NAME=My Extension
ADDFOX_PRIVATE_API_KEY=secret_key_here
```

## Префикс по умолчанию

Addfox по умолчанию экспонирует только переменные окружения, начинающиеся с `ADDFOX_PUBLIC_`:

```ts
// app/popup/index.tsx
console.log(process.env.ADDFOX_PUBLIC_API_URL);   // ✅ "https://api.example.com"
console.log(process.env.ADDFOX_PUBLIC_APP_NAME);  // ✅ "My Extension"
console.log(process.env.ADDFOX_PRIVATE_API_KEY);  // ❌ undefined
console.log(process.env.PRIVATE_API_KEY);         // ❌ undefined
```

## Область действия

Переменные окружения внедряются во все **клиентские** entry:

- **background** — Service Worker / Background script
- **content** — Content Script
- **popup** — Всплывающее окно
- **options** — Страница настроек
- **sidepanel** — Боковая панель
- **devtools** — Инструменты разработчика

:::tip Различие между сервером и клиентом
- `process.env.*` в конфигурации `manifest` разрешается на **этапе сборки** (сервер)
- `process.env.*` в коде entry доступен на **этапе выполнения** (клиент)

:::

## Встроенные переменные

Addfox автоматически внедряет следующие встроенные переменные, без необходимости определения в `.env`:

| Имя переменной | Описание | Пример значения |
|--------|------|--------|
| `process.env.BROWSER` | Текущий браузер сборки | `chrome`, `firefox` |
| `process.env.NODE_ENV` | Текущее окружение | `development`, `production` |
| `process.env.ADDFOX_VERSION` | Версия Addfox | `1.0.0` |

## Разные окружения

### Окружение разработки

Создайте `.env.development`:

```bash
# .env.development
ADDFOX_PUBLIC_API_URL=http://localhost:3000
ADDFOX_PUBLIC_DEBUG=true
```

### Продакшн окружение

Создайте `.env.production`:

```bash
# .env.production
ADDFOX_PUBLIC_API_URL=https://api.example.com
ADDFOX_PUBLIC_DEBUG=false
```

### Приоритет файлов окружения

1. `.env.{mode}.local` — локальный специфический режим (наивысший приоритет, не коммитится в Git)
2. `.env.{mode}` — специфический режим
3. `.env.local` — локальное окружение (не коммитится в Git)
4. `.env` — по умолчанию (низший приоритет)

## Полный пример

```bash
# .env
ADDFOX_PUBLIC_API_URL=https://api.example.com
ADDFOX_PUBLIC_FEATURE_FLAG=true
ADDFOX_PRIVATE_DATABASE_URL=secret
```

```ts
// addfox.config.ts
export default defineConfig({
  manifest: {
    name: process.env.ADDFOX_PUBLIC_APP_NAME || "My Extension",
  },
});
```

```ts
// app/popup/index.tsx
const apiUrl = process.env.ADDFOX_PUBLIC_API_URL;
const showFeature = process.env.ADDFOX_PUBLIC_FEATURE_FLAG === "true";
```

## Примечания

- Значения переменных окружения всегда строки
- Булевы значения требуют ручного преобразования: `process.env.ADDFOX_PUBLIC_DEBUG === "true"`
- После изменения файла `.env` необходимо перезапустить сервер разработки
- Не используйте переменные без префикса `ADDFOX_PUBLIC_` в клиентском коде, они будут `undefined`
