# TypeScript

Addfox se basa en Rsbuild, proporciona capacidad de TypeScript de forma predeterminada, sin necesidad de integrar cadena de compilación adicional para usar `.ts` / `.tsx`.

## Capacidades de soporte integradas

- **Compilación lista para usar**: Procesa automáticamente archivos `.ts`, `.tsx`.
- **Verificación de tipos separada**: El flujo de construcción se enfoca en compilación y empaquetado; Puedes usar `tsc --noEmit` o IDE para verificación de tipos durante desarrollo.
- **Colaboración con múltiples entradas**: Se puede usar TypeScript directamente en entradas como `background`, `content`, `popup`, `options`.

## Alias de rutas (reconocimiento directo de tsconfig)

Addfox reconocerá directamente `compilerOptions.baseUrl` y `compilerOptions.paths` en `tsconfig.json` (o `tsconfig.base.json`), usándolos para resolución de módulos.  
Es decir, la configuración común de alias de rutas no necesita escribirse nuevamente en la configuración de Addfox.

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["app/*"],
      "@shared/*": ["shared/*"]
    }
  }
}
```

Luego puedes usar directamente en código:

```ts
import { getEnv } from "@/shared/env";
import { logger } from "@shared/logger";
```

## Recomendaciones

- Mantener alias de rutas `tsconfig` uniformemente en la raíz del proyecto, evitando configuración repetida en múltiples lugares.
- Agregar `tsc --noEmit` en CI para exponer problemas de tipo lo antes posible.

## Referencia

- [Guía de TypeScript de Rsbuild](https://rsbuild.rs/zh/guide/basic/typescript)
