---
name: addfox-llms
description: llms.txt proporciona directrices de alto nivel del proyecto para modelos de lenguaje grande. Define la arquitectura central del proyecto, puntos de entrada y convenciones que el AI debe seguir durante el desarrollo.
---

# llms.txt

`llms.txt` es el archivo de contexto principal que Addfox proporciona para asistentes de AI. Se encuentra en el directorio `.addfox/` en la raíz del proyecto y se utiliza para ayudar al AI a establecer rápidamente un conocimiento global del proyecto al inicio de la conversación.

## 1. Estructura principal

El `llms.txt` generado contiene los siguientes bloques estándar:

### Descripción general del proyecto

Lista los metadatos básicos del proyecto, como nombre, descripción, versión e información del framework utilizado.

### Índice de puntos de entrada

Lista todos los puntos de entrada de extensión identificados (como background, content, popup, etc.) y sus rutas absolutas de archivos fuente correspondientes.

### Guía de archivos de asistencia de AI

Introduce el propósito de otros archivos de asistencia en el directorio `.addfox/`, incluyendo `llms.txt` mismo, `meta.md` y `error.md`.

### Tabla de asistencia de decisiones

Proporciona una guía de consulta basada en escenarios, indicando al AI qué archivo consultar en diferentes situaciones como "primer contacto con el proyecto", "comprensión de estructura", "problemas de construcción", "errores en tiempo de ejecución", etc.

### Convenciones del framework

Explica las convenciones principales de Addfox, como nombres de entrada estándar (popup, background, etc.) y el significado de las opciones de configuración de entrada (html, scriptInject, etc.).

---

> **Nota**: Este archivo se genera automáticamente por el framework Addfox. Cuando la configuración del proyecto (como `addfox.config.ts`) cambia, este archivo se actualiza en consecuencia. Siempre guía al AI para que lea la versión más reciente.
