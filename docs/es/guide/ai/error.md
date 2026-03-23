---
name: addfox-error
description: error.md registra la pila de errores en tiempo de ejecución original y el contexto de la extensión del navegador, siendo la única fuente de verdad para que el AI procese problemas en tiempo de ejecución.
---

# error.md

Cuando Addfox detecta errores en tiempo de ejecución en la extensión del navegador, genera el archivo `error.md` y lo almacena en el directorio `.addfox/` en la raíz del proyecto.

## 1. Estructura principal

El `error.md` generado contiene los siguientes bloques estándar:

### Resumen del error

Proporciona los metadatos básicos del error, incluyendo:
- **Entry**: Punto de entrada donde ocurrió el error (como `content`, `background`, `popup`).
- **Type**: Tipo de error (como `error`, `warning`).
- **Time**: Hora local cuando ocurrió el error.
- **Message**: Contenido del mensaje de error original.
- **Location**: Ubicación del código fuente donde ocurrió el error o ruta del recurso compilado.

### Contexto de construcción

Proporciona información básica de la pila tecnológica de construcción, como:
- **Bundler**: Nombre de la herramienta de construcción (generalmente `rsbuild`).
- **Framework**: Framework de UI actual en uso.

### Seguimiento de pila

Proporciona la pila de llamadas de error de JavaScript completa. El AI puede rastrear rápidamente la línea de código específica que causó el crash analizando esta parte.

---

> **Nota**: Este archivo solo conserva la información del error más reciente capturado. Cuando el servidor de desarrollo se reinicia o ocurre un nuevo error, el contenido antiguo se borrará.
