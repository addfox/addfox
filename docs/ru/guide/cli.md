# CLI

На этой странице собраны команды и параметры, поддерживаемые CLI `addfox`.

## Базовое использование

```bash
addfox <command> [options]
```

## Настройка scripts в package.json

```json
{
  "scripts": {
    "dev": "addfox dev",
    "dev:firefox": "addfox dev -b firefox",
    "build": "addfox build",
    "build:chrome": "addfox build -b chrome",
    "test": "addfox test"
  }
}
```

## Команды

| Команда | Описание |
|------|------|
| `dev` | Запуск режима разработки (с поддержкой горячего обновления). |
| `build` | Выполнение продакшн сборки. |
| `test` | Запуск тестов (параметры передаются в rstest). |

> `addfox test` читает конфигурацию из `rstest.config.*` или поля [`test`](/config/test) в `addfox.config`; когда присутствуют оба, приоритет имеет `rstest.config.*`.

## Часто используемые параметры (значения по умолчанию + сопоставление с конфигурацией)

| Параметр | Встроенное значение по умолчанию | Соответствующее поле `addfox.config` | Описание |
|------|------------|---------------------------|------|
| `-b, --browser <browser>` | `chromium` | Нет прямого поля (влияет на цель и запуск) | Указание целевого/запускаемого браузера, подробнее см. список поддерживаемых браузеров ниже. |
| `--keep-browser-profile` | `false` | `keepBrowserProfile` | Сохранять профиль браузера между запусками (по умолчанию каждый запуск использует новый профиль). |
| `--no-keep-browser-profile` | `false` (только для текущей команды) | `keepBrowserProfile` | Использовать новый профиль браузера для текущего запуска. |
| `-r, --report` | `false` | `report` | Включить отчет об анализе сборки Rsdoctor. |
| `--no-open` | `false` (т.е. по умолчанию автоматически открывать) | Нет прямого поля | Не открывать браузер автоматически при сборке или разработке. |
| `--debug` | `false` | `debug` | Включить режим отладки (мониторинг ошибок и т.д. при разработке). |
| `--help` | - | - | Показать справку. |
| `--version` | - | - | Показать версию. |

> `-c, --cache` и `--no-cache` — устаревшие (deprecated) псевдонимы `--keep-browser-profile` / `--no-keep-browser-profile`; они по-прежнему работают, но выводят предупреждение об устаревании в терминале.

## Список поддерживаемых браузеров

Параметр `-b, --browser` поддерживает следующие браузеры:

| Браузер | Описание |
|--------|------|
| `chromium` | Chromium (по умолчанию) |
| `chrome` | Google Chrome |
| `edge` | Microsoft Edge |
| `brave` | Brave Browser |
| `vivaldi` | Vivaldi |
| `opera` | Opera |
| `santa` | Santa Browser |
| `arc` | Arc Browser |
| `yandex` | Yandex Browser |
| `browseros` | BrowserOS |
| `custom` | Пользовательский браузер (требуется настройка `browser.custom`) |
| `firefox` | Mozilla Firefox |

## Примеры

```bash
# Режим разработки Chromium
addfox dev -b chromium

# Разработка Firefox + отладка
addfox dev -b firefox --debug

# Продакшн сборка
addfox build -b chrome

# Сборка без автоматического открытия браузера
addfox build -b chrome --no-open

# Генерация отчета об анализе сборки
addfox build -r
```

## Примечания

- `--debug` в основном действует в режиме `dev`.
- По умолчанию каждый запуск использует новый профиль; чтобы сохранять состояние входа и другие данные профиля, используйте `--keep-browser-profile` или `keepBrowserProfile: true` в конфигурационном файле (также можно переопределить для отдельного браузера через `browser.<name>.keepBrowserProfile`).
- `-b/--browser` не имеет отдельного поля config, является выбором на уровне команды.
