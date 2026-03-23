---
name: addfox-meta
description: meta.md proporciona metadatos estructurados del proyecto, incluyendo configuración de permisos, mapeo de entradas, productos de construcción, etc., siendo la base clave para que el AI realice refactorización de código y diseño de funciones.
---

# meta.md

`meta.md` es el contexto estructurado detallado que Addfox proporciona para asistentes de AI, ubicado en el directorio `.addfox/` en la raíz del proyecto.

## 1. Estructura principal

El `meta.md` generado contiene los siguientes bloques estándar:

### Información básica

Incluye nombre del framework, nombre del proyecto, descripción, versión y número de versión actual de Manifest.

### Configuración de permisos

Lista detalladamente los permisos solicitados por la extensión, divididos en tres categorías:
- **Permissions**: Permisos de funcionalidad básica.
- **Host Permissions**: Permisos de host.
- **Optional Permissions**: Permisos opcionales.

### Mapeo de entradas

Esta es la parte más importante, lista la información detallada de todas las entradas de extensión:
- **Source**: Ruta absoluta del archivo de código fuente.
- **HTML**: Ruta de la plantilla HTML asociada (si existe).
- **JS Output**: Ruta del script generado por la construcción.
- **Flags**: Marcas de configuración de esta entrada (como `html: true`, `scriptInject: body`, etc.).

---

> **Nota**: Antes de realizar ajustes arquitectónicos complejos o modificar `addfox.config.ts`, asegúrate de guiar al AI para que lea este archivo y garantice que el esquema generado sea compatible con la arquitectura actual del proyecto.
