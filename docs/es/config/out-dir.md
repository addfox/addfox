# outDir

`outDir` se utiliza para especificar el nombre del directorio de salida de la construcción.

## Resumen

- **Tipo**: `string`
- **Valor por defecto**: `"extension"`
- **Requerido**: No

## Uso

```ts
// addfox.config.ts
import { defineConfig } from "addfox";

export default defineConfig({
  outDir: "dist",  // Salida a .addfox/dist/
});
```

## Ruta de salida completa

La ruta de salida final se compone de:

```
{outputRoot}/{outDir}/
```

- `outputRoot`: Fijo como `.addfox`
- `outDir`: Predeterminado `"extension"`, puede personalizarse

Ruta completa predeterminada: `.addfox/extension/`

## Ejemplos

### Cambiar a dist

```ts
export default defineConfig({
  outDir: "dist",
});
```

Directorio de salida: `.addfox/dist/`

### Estructura del producto de construcción

```
.addfox/
├── dist/                   # Salida de construcción (outDir: "dist")
│   ├── manifest.json
│   ├── background/
│   │   └── index.js
│   ├── content/
│   │   └── index.js
│   └── popup/
│       ├── index.html
│       └── index.js
└── cache/                  # Caché de construcción
```

## Notas

- `outDir` solo afecta el nombre del directorio de salida, el directorio padre `.addfox` permanece fijo
- Después de modificar `outDir`, las rutas en el manifest se actualizarán automáticamente
- Durante el desarrollo, el directorio de extensión que carga el navegador también es esta ruta

## Configuraciones relacionadas

- [`zip`](/config/zip) - Configuración de empaquetado
- [guide/output](/guide/output) - Guía de salida
