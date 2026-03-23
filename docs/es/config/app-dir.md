# appDir

`appDir` se utiliza para especificar el directorio de código fuente de la aplicación, que es la ruta base para el descubrimiento de entradas y la carga automática del manifest.

## Resumen

- **Tipo**: `string`
- **Valor por defecto**: `"app"`
- **Requerido**: No

## Uso

```ts
// addfox.config.ts
import { defineConfig } from "addfox";

export default defineConfig({
  appDir: "src",  // Usar el directorio src como raíz de la aplicación
});
```

## Función

Después de configurar `appDir`, afecta los siguientes comportamientos:

1. **Descubrimiento de entradas** — Descubre automáticamente las entradas desde el directorio `appDir`
2. **Resolución de rutas de entry** — Las rutas en la configuración `entry` son relativas a `appDir`
3. **Carga de manifest** — Carga el archivo manifest desde `appDir` o sus subdirectorios

## Ejemplos

### Usar el directorio src

```ts
// addfox.config.ts
export default defineConfig({
  appDir: "src",
});
```

Estructura de directorios:

```tree
my-extension/
├── src/                    # Código fuente de la aplicación
│   ├── background/
│   │   └── index.ts
│   ├── content/
│   │   └── index.ts
│   ├── popup/
│   │   └── index.tsx
│   └── manifest.json
├── addfox.config.ts
└── package.json
```

### Usar la raíz del proyecto

```ts
// addfox.config.ts
export default defineConfig({
  appDir: ".",  // Usar la raíz del proyecto
});
```

## Notas

- `appDir` se resuelve como ruta absoluta (relativa a la raíz del proyecto)
- Se recomienda mantener el valor predeterminado `"app"` o el común `"src"`, para facilitar la colaboración del equipo
- Después de modificar `appDir`, asegúrate de actualizar las rutas en `entry` correspondientemente

## Configuraciones relacionadas

- [`entry`](/config/entry) - Configuración de entradas
- [`manifest`](/config/manifest) - Configuración del manifest de la extensión
- [guide/app-dir](/guide/app-dir) - Guía de estructura de directorios
