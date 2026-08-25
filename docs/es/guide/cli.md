# CLI

Esta página resume los comandos y parámetros soportados por el CLI de `addfox`.

## Uso básico

```bash
addfox <command> [options]
```

## Configurar scripts en package.json

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

## Comandos

| Comando | Descripción |
|------|------|
| `dev` | Iniciar modo de desarrollo (soporta recarga en caliente). |
| `build` | Ejecutar construcción de producción. |
| `test` | Ejecutar pruebas (los parámetros se pasan a rstest). |

## Parámetros comunes (valores predeterminados + mapeo de configuración)

| Parámetro | Valor predeterminado interno | Campo `addfox.config` correspondiente | Descripción |
|------|------------|---------------------------|------|
| `-b, --browser <browser>` | `chromium` | Sin campo directo (afecta objetivo e inicio) | Especificar navegador objetivo/de inicio, ver [Lista de navegadores soportados](#lista-de-navegadores-soportados) abajo. |
| `--keep-browser-profile` | `false` | `keepBrowserProfile` | Conservar el perfil del navegador entre ejecuciones (por defecto: perfil nuevo en cada ejecución). |
| `--no-keep-browser-profile` | `false` (solo comando actual) | `keepBrowserProfile` | Usar un perfil de navegador nuevo para esta ejecución. |
| `-r, --report` | `false` | `report` | Habilitar informe de análisis de construcción de Rsdoctor. |
| `--no-open` | `false` (es decir, abrir automáticamente por defecto) | Sin campo directo | No abrir navegador automáticamente durante construcción o desarrollo. |
| `--debug` | `false` | `debug` | Habilitar modo de depuración (monitoreo de errores durante desarrollo, etc.). |
| `--help` | - | - | Mostrar ayuda. |
| `--version` | - | - | Mostrar número de versión. |

> `-c, --cache` y `--no-cache` son alias obsoletos (deprecated) de `--keep-browser-profile` / `--no-keep-browser-profile`; siguen funcionando pero muestran una advertencia de deprecación en la terminal.

## Lista de navegadores soportados

El parámetro `-b, --browser` soporta los siguientes navegadores:

| Navegador | Descripción |
|--------|------|
| `chromium` | Chromium (predeterminado) |
| `chrome` | Google Chrome |
| `edge` | Microsoft Edge |
| `brave` | Brave Browser |
| `vivaldi` | Vivaldi |
| `opera` | Opera |
| `santa` | Santa Browser |
| `arc` | Arc Browser |
| `yandex` | Yandex Browser |
| `browseros` | BrowserOS |
| `custom` | Navegador personalizado (necesita especificar `browser.custom` en configuración) |
| `firefox` | Mozilla Firefox |

## Ejemplos

```bash
# Modo de desarrollo Chromium
addfox dev -b chromium

# Desarrollo Firefox + depuración
addfox dev -b firefox --debug

# Construcción de producción
addfox build -b chrome

# Construir pero no abrir navegador automáticamente
addfox build -b chrome --no-open

# Generar informe de análisis de construcción
addfox build -r
```

## Notas

- `--debug` funciona principalmente en modo `dev`.
- Por defecto cada ejecución usa un perfil nuevo; para conservar el estado de inicio de sesión, usa `--keep-browser-profile` o `keepBrowserProfile: true` en el archivo de configuración (también puedes sobrescribirlo por navegador con `browser.<name>.keepBrowserProfile`).
| `-b/--browser` no tiene campo de configuración separado, es una selección a nivel de comando.
