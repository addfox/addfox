# Introducción

**Addfox** es un marco de desarrollo de extensiones de navegador basado en [Rsbuild](https://rsbuild.dev), que te ayuda a desarrollar y construir extensiones para Chrome y Firefox en el mismo proyecto.

![Visión general de la arquitectura de Addfox](/addfox-architecture.png)

## ¿Por qué elegir Addfox?

Desarrollar extensiones de navegador debería ser simple: solo necesitas tecnologías web como HTML, JavaScript y CSS. Pero en la realidad, problemas como la recarga en caliente, la depuración de errores y la integración con frameworks frontend han plagado a los desarrolladores.

El objetivo de Addfox es devolver la simplicidad al desarrollo de extensiones:

En la era de la IA, Addfox va un paso más allá, permitiendo que la IA comprenda y asista mejor en el desarrollo de tus extensiones:

- **Estructura de proyecto amigable para IA** — Genera automáticamente documentación estructurada como `llms.txt`, `meta.md`, etc., permitiendo que los asistentes de IA comprendan rápidamente la arquitectura y configuración del proyecto
- **Salida de errores en terminal** — Los errores durante el desarrollo se muestran directamente en la terminal, sin necesidad de abrir las DevTools del navegador, facilitando el uso de la función Ask AI en cualquier editor
- **Soporte de Skills** — Biblioteca de skills de IA reutilizables incorporada (como migrate-to-addfox, addfox-debugging, etc.), permitiendo que los asistentes de IA ayuden de manera más profesional en el desarrollo y la depuración
- **Mínimas restricciones de código** — No impone una forma específica de organizar el código, el código generado por IA puede integrarse perfectamente en el proyecto

Ya seas desarrollador o uses IA para asistirte en el desarrollo, Addfox ofrece una mejor experiencia.

## Características

### Para desarrolladores

Hot reload, soporte multi-navegador y configuración minimalista para entregar extensiones más rápido.

| Característica | Descripción |
|------|------|
| **HMR ultrarrápido** | Usa un Reloader independiente para controlar las actualizaciones de la extensión, content_script y background logran HMR ultrarrápido |
| **Soporte completo de navegadores** | Soporta navegadores principales basados en Chromium y Firefox, identifica automáticamente la ruta de instalación predeterminada del navegador sin configuración |
| **Independiente del framework** | Puedes usar Vanilla, o también frameworks como Vue, React, Preact, Svelte, Solid |
| **Soporte de Content UI** | Proporciona el método integrado createContentUI para integrar fácilmente Iframe, ShadowDom y contenido nativo |
| **Ecosistema Rstack** | Soporte integrado para Rsdoctor y Rstest, permitiendo análisis rápido del bundle y pruebas unitarias y e2e |
| **Soporte de salida Zip** | Genera automáticamente el paquete zip de la extensión al construir, facilitando la instalación y distribución |

### Para IA

Meta estructurada, salida de errores en terminal y Skills para que la IA entienda y extienda tu extensión.

| Característica | Descripción |
|------|------|
| **llms.txt y metadatos markdown** | Proporciona información clara del plugin, errores y prompts para ayudar al desarrollo con AI agent |
| **Monitoreo de errores amigable con IA** | Habilita la salida de errores en terminal con `--debug`, domina todos los errores del plugin sin operar en el navegador, facilitando el uso de Ask AI en cualquier Editor |
| **Soporte de Skills** | Skills extensibles, con soporte para Agent y automatización |

## Conceptos principales

Addfox encapsula los puntos de dolor comunes en el desarrollo de extensiones:

- **Descubrimiento automático de entry** — Coloca los archivos según la convención, sin necesidad de configurar entry manualmente
- **Procesamiento inteligente de Manifest** — Inyecta automáticamente las rutas construidas
- **Recarga automática en desarrollo** — WebSocket escucha la finalización de la construcción y actualiza la extensión automáticamente

## Comparación con otras soluciones

El ecosistema de desarrollo de extensiones de navegador es más rico gracias a estos excelentes frameworks. **WXT** aporta el rendimiento de Vite y un sistema de plugins bien diseñado, junto con una experiencia de desarrollo intuitiva basada en convenciones. **Plasmo** ofrece integración completa con servicios en la nube y excelente experiencia de desarrollo listo para usar. **Extension.js** es conocido por su simplicidad y facilidad de uso, ideal para desarrollo rápido de prototipos. Cada framework ha contribuido significativamente a reducir la barrera de entrada al desarrollo de extensiones.

Addfox aprende de estas excelentes prácticas mientras sigue su propio camino:

| Solución | Herramienta de construcción | Versión | Experiencia de desarrollo | Flexibilidad |
|------|----------|---------|----------|--------|
| Webpack/Vite manual | Configuración manual | - | Requiere manejo manual de HMR | Control total |
| Plasmo | Parcel | latest | Listo para usar | Basado en convenciones, incluye servicios en la nube |
| WXT | Vite | ^0.20.18 | Listo para usar | Basado en convenciones, rico ecosistema de plugins |
| Extension.js | Rspack | latest | Listo para usar | Configuración cero, minimalista |
| **Addfox** | **Rsbuild 1.7.5** | **0.1.1-beta.12** | **Listo para usar** | **Mínimas convenciones + Nativo para IA** |

**Ventajas únicas de Addfox:**

- **Velocidad extrema de Rsbuild** — Arranque en frío y recarga en caliente más rápidos que las soluciones Vite/Parcel
- **Diseño priorizando la IA** — `llms.txt` incorporado, salida de errores estructurada y soporte de Skills, diseñado específicamente para desarrollo asistido por IA
- **Máxima libertad** — No impone estructura de archivos, sin APIs personalizadas, usa la forma de organizar código que prefieras
- **Realmente independiente del framework** — Sin necesidad de envolver componentes o adaptadores especiales, funciona perfectamente con cualquier framework de UI

## Inicio rápido

```bash
# Crear proyecto con el scaffolding
pnpm create addfox-app

# Entrar al directorio del proyecto
cd my-extension

# Iniciar servidor de desarrollo
pnpm dev
```

Edita el archivo `app/popup/index.tsx`, guarda y la extensión se recargará automáticamente.

## Siguientes pasos

- [Guía de instalación](/guide/install) — Pasos detallados para crear un proyecto
- [Estructura del directorio](/guide/app-dir) — Comprende la organización del proyecto
- [Referencia de configuración](/config/manifest) — Ver todas las opciones de configuración
