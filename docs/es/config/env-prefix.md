# Variables de entorno

Addfox usa `loadEnv` de Rsbuild para cargar archivos `.env` en la raíz del proyecto, y por defecto solo expone variables que comiencen con `ADDFOX_PUBLIC_` al código del cliente.

## Comportamiento predeterminado

- **Prefijo predeterminado**: `ADDFOX_PUBLIC_`
- **Código del cliente**: Entradas como background, content, popup, options, sidepanel, devtools
- **Archivos cargados**: `.env`, `.env.local`, `.env.{mode}`, `.env.{mode}.local`

## Alcance de aplicación

Las variables de entorno se inyectan en todas las entradas de **código del cliente**, pero **no** en la configuración `manifest` de `addfox.config.ts` (que usa el entorno de construcción).

## Variables integradas

Addfox inyecta automáticamente las siguientes variables:

| Nombre de variable | Descripción |
|--------|------|
| `process.env.BROWSER` | Navegador objetivo de la construcción actual |
| `process.env.NODE_ENV` | Modo de entorno actual |
| `process.env.ADDFOX_VERSION` | Versión de Addfox |

## Ejemplos de uso

### Archivo .env

```bash
ADDFOX_PUBLIC_API_URL=https://api.example.com
ADDFOX_PUBLIC_APP_NAME=My Extension
ADDFOX_PRIVATE_KEY=secret  # No se expone al cliente
```

### Uso en código

```ts
// app/popup/index.tsx
const apiUrl = process.env.ADDFOX_PUBLIC_API_URL;
```

## Recomendaciones de seguridad

- Usa siempre el prefijo `ADDFOX_PUBLIC_` para marcar las variables que pueden exponerse al cliente
- La información sensible (como claves API) no debe comenzar con `ADDFOX_PUBLIC_`
- Los archivos `.env.local` y `.env.{mode}.local` no deben enviarse a Git

## Documentación relacionada

- [guide/env-prefix](/guide/env-prefix) - Guía de uso de variables de entorno
