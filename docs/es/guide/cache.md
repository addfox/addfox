# Caché

Addfox crea el directorio `.addfox/cache` en tu proyecto para acelerar el desarrollo.

## Qué se almacena en `.addfox/cache`

- **`cache/build/`** — Caché persistente de build de Rspack. Habilitada por defecto, acelera las recompilaciones y los reinicios de dev. Configúrala con [`buildCache`](/config/cache).
- **`cache/browser-profile/`** — Directorios de datos de usuario (profile) de Chromium. Por defecto, cada ejecución de `addfox dev` inicia con un **profile completamente nuevo**; el profile solo se conserva entre ejecuciones cuando habilitas [`keepBrowserProfile`](/config/cache) (configuración de nivel superior, override por navegador, o el flag CLI `--keep-browser-profile`).

Los archivos exactos pueden variar según la plataforma y el modo, pero el objetivo es el mismo: **evitar la inicialización en frío repetida**.

## Por qué importa

- **Recompilaciones más rápidas**: la caché persistente de build omite la recompilación de módulos sin cambios.
- **Persistencia opcional del profile**: con `keepBrowserProfile` habilitado, el estado de instalación de la extensión, la configuración y las sesiones de inicio de sesión se conservan entre ejecuciones de `addfox dev`.

## Cuándo limpiar la caché

Limpia `.addfox/cache` si observas:

- Comportamiento inesperado del profile del navegador
- Inconsistencias en el estado de carga de la extensión
- Necesidad de un entorno de depuración desde cero

Puedes eliminar el directorio de forma segura; Addfox lo recreará en la próxima ejecución.

## Configuración relacionada

- [`keepBrowserProfile` / `buildCache`](/config/cache) - Configuración de caché
