# plugins

`plugins` se utiliza para configurar plugins de Rsbuild.

## Resumen

- **Tipo**: `RsbuildPlugin[]`
- **Valor por defecto**: `undefined`
- **Requerido**: No

## Uso

```ts
// addfox.config.ts
import { defineConfig } from "addfox";
import { pluginReact } from "@rsbuild/plugin-react";
import { pluginVue } from "@addfox/rsbuild-plugin-vue";

export default defineConfig({
  plugins: [
    pluginReact(),
    // o pluginVue(),
  ],
});
```

## Plugins de frameworks

### React

```bash
npm install @rsbuild/plugin-react
```

```ts
import { pluginReact } from "@rsbuild/plugin-react";

export default defineConfig({
  plugins: [pluginReact()],
});
```

### Vue

```bash
npm install @addfox/rsbuild-plugin-vue
```

```ts
import { pluginVue } from "@addfox/rsbuild-plugin-vue";

export default defineConfig({
  plugins: [pluginVue()],
});
```

### Otros frameworks

- **Preact**: `@rsbuild/plugin-preact`
- **Svelte**: `@rsbuild/plugin-svelte`
- **Solid**: `@rsbuild/plugin-solid`

## Otros plugins comunes

### Verificación de tipos TypeScript

```ts
import { pluginTypeCheck } from "@rsbuild/plugin-type-check";

export default defineConfig({
  plugins: [pluginTypeCheck()],
});
```

### Procesamiento de SVG

```ts
import { pluginSvgr } from "@rsbuild/plugin-svgr";

export default defineConfig({
  plugins: [
    pluginSvgr({
      svgrOptions: {
        exportType: "default",
      },
    }),
  ],
});
```

## Plugins integrados

Los siguientes plugins son inyectados automáticamente por Addfox, no es necesario configurarlos manualmente:

| Plugin | Función |
|------|------|
| `plugin-extension-entry` | Procesa entradas de extensión y generación de HTML |
| `plugin-extension-manifest` | Procesa generación de manifest e inyección de rutas |
| `plugin-extension-hmr` | Recarga en caliente durante desarrollo (solo modo dev) |
| `plugin-extension-monitor` | Monitoreo de errores (modo dev + debug) |

## Notas

- El array de plugins se pasa a Rsbuild
- El orden de ejecución de plugins es el orden del array
- Los plugins de framework procesan automáticamente la lógica específica de extensiones

## Configuraciones relacionadas

- [`rsbuild`](/config/rsbuild) - Configuración de Rsbuild
- [Lista de plugins de Rsbuild](https://rsbuild.dev/plugins/list)
