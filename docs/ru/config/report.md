# report

`report` используется для включения отчета об анализе сборки Rsdoctor.

## Обзор

- **Тип**: `boolean | RsdoctorReportOptions`
- **Значение по умолчанию**: `false`
- **Обязательный**: Нет

## Использование

```ts
// addfox.config.ts
import { defineConfig } from "addfox";

export default defineConfig({
  report: true,  // Включить отчет Rsdoctor
});
```

## Способы конфигурации

### Булево значение

```ts
export default defineConfig({
  report: true,   // Включить отчет
  // report: false, // Отключить отчет (по умолчанию)
});
```

### Объектная форма

Передача опций конфигурации Rsdoctor:

```ts
export default defineConfig({
  report: {
    mode: "normal",
    port: 9988,
    disableClientServer: false,
  },
});
```

## Опции Rsdoctor

| Опция | Тип | Описание |
|------|------|------|
| `mode` | `"brief" \| "normal" \| "lite"` | Режим отчета |
| `port` | `number` | Порт сервера отчета |
| `disableClientServer` | `boolean` | Отключить клиентский сервер |
| `output` | `object` | Конфигурация вывода |

Больше опций смотрите в [документации Rsdoctor](https://rsdoctor.rs/config/options/options).

## Включение через CLI

```bash
# Включить отчет
addfox dev -r
addfox build -r

# Или использовать --report
addfox dev --report
```

Параметры CLI переопределяют значение `report` в конфигурации.

## Содержимое отчета

После включения, по завершении сборки автоматически открывается страница аналитического отчета, содержащая:

- Анализ времени сборки
- Граф зависимостей модулей
- Анализ размера пакета
- Обнаружение дублирующихся зависимостей
- Предупреждения и ошибки компиляции

## Примечания

- Функция отчета увеличивает время сборки
- Рекомендуется включать при диагностике проблем сборки
- Можно использовать и в продакшн сборке

## Связанные ссылки

- [Официальная документация Rsdoctor](https://rsdoctor.rs/)
