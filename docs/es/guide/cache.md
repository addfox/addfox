# Caché

Addfox genera el directorio `.addfox/cache` en el proyecto para mejorar la experiencia del modo de desarrollo.

## Qué hay en `.addfox/cache`

El contenido común incluye:

- Caché de datos de usuario del navegador (para reutilizar el estado de carga de la extensión)
- Caché intermedio durante el proceso de construcción (reducir el overhead de recompilación)

En diferentes plataformas y modos de ejecución, la estructura de archivos de caché puede variar ligeramente, pero la función es la misma: **reducir el costo de inicialización repetida**.

## Función

El beneficio más intuitivo es la experiencia de inicio del navegador en modo de desarrollo:

- Primera vez `addfox dev`: Se necesita inicializar completamente el entorno del navegador, cargar la extensión;
- Ejecuciones posteriores de `addfox dev`: Después de reutilizar la caché, el navegador puede entrar más rápidamente en estado depurable, reduciendo operaciones manuales.

Por ejemplo, en el escenario que mencionas: después de la primera ejecución ya hay caché, la segunda ejecución generalmente no necesita repetir manualmente el mismo flujo.

## Cuándo limpiar la caché

Puedes limpiar `.addfox/cache` y reintentar en las siguientes situaciones:

- Estado de configuración del navegador anormal
- Comportamiento de carga de la extensión inconsistente con lo esperado
- Quieres volver al estado de "inicio limpio" para investigar problemas

Puedes eliminar directamente este directorio, Addfox lo reconstruirá automáticamente en la próxima ejecución.
