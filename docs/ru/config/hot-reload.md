# hotReload

`hotReload` используется для настройки поведения горячей перезагрузки при разработке.

## Обзор

- **Тип**: `{ port?: number; autoRefreshContentPage?: boolean }`
- **Значение по умолчанию**: `{ port: 23333, autoRefreshContentPage: true }`
- **Обязательный**: Нет

## Использование

```ts
// addfox.config.ts
import { defineConfig } from "addfox";

export default defineConfig({
  hotReload: {
    port: 23333,                    // Порт WebSocket
    autoRefreshContentPage: false,   // Автоматически обновлять страницу при изменении content
  },
});
```

## Параметры конфигурации

### port

- **Тип**: `number`
- **Значение по умолчанию**: `23333`
- **Описание**: Порт сервера WebSocket, используемый для связи с расширением при разработке

```ts
export default defineConfig({
  hotReload: {
    port: 3000,  // Использовать порт 3000
  },
});
```

### autoRefreshContentPage

- **Тип**: `boolean`
- **Значение по умолчанию**: `true`
- **Описание**: Автоматически обновлять текущую вкладку после изменения content script

```ts
export default defineConfig({
  hotReload: {
    autoRefreshContentPage: false,  // Не обновлять страницу автоматически
  },
});
```

## Принцип работы

1. `addfox dev` запускает сервер WebSocket (по умолчанию порт 23333)
2. Расширение устанавливает соединение с сервером через WebSocket
3. Изменение кода → пересборка → WebSocket отправляет команду перезагрузки
4. Расширение автоматически перезагружается, страница обновляется

:::tip Различие между Background и Content
- **Background** изменение: полная перезагрузка расширения, перезапуск Service Worker
- **Content** изменение: перезагрузка расширения + повторная инъекция на страницу

:::

## Связанная конфигурация

- [guide/hmr](/guide/hmr) — руководство по горячему обновлению
