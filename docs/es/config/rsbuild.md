# rsbuild

`rsbuild` se utiliza para personalizar o extender la configuración de Rsbuild.

## Resumen

- **Tipo**: `RsbuildConfig | ((base: RsbuildConfig, helpers: RsbuildConfigHelpers) => RsbuildConfig | Promise<RsbuildConfig>)`
- **Valor por defecto**: `undefined`
- **Requerido**: No

## Formas de configuración

### Forma de objeto (fusión profunda)

El objeto de configuración se fusiona profundamente con la configuración predeterminada:

```ts
// addfox.config.ts
import { defineConfig } from "addfox";

export default defineConfig({
  rsbuild: {
    source: {
      alias: {
        "@": "./app",
      },
    },
    output: {
      distPath: {
        root: "./dist",
      },
    },
  },
});
```

### Forma de función (control completo)

La forma de función recibe la configuración predeterminada y devuelve la configuración final:

```ts
// addfox.config.ts
import { defineConfig } from "addfox";

export default defineConfig({
  rsbuild: (base, helpers) => {
    // Usar helpers.merge para fusión profunda
    return helpers.merge(base, {
      source: {
        alias: {
          "@": "./app",
        },
      },
    });
  },
});
```

## Configuraciones comunes

### Alias de rutas

```ts
export default defineConfig({
  rsbuild: {
    source: {
      alias: {
        "@": "./app",
        "@/components": "./app/components",
        "@/utils": "./app/utils",
      },
    },
  },
});
```

Uso en código:

```ts
import { Button } from "@/components/Button";
import { formatDate } from "@/utils/date";
```

### Definir variables globales

```ts
export default defineConfig({
  rsbuild: {
    source: {
      define: {
        __VERSION__: JSON.stringify(process.env.npm_package_version),
        __DEV__: JSON.stringify(process.env.NODE_ENV === "development"),
      },
    },
  },
});
```

### Configurar CSS

```ts
export default defineConfig({
  rsbuild: {
    css: {
      modules: {
        localIdentName: "[local]--[hash:base64:5]",
      },
    },
  },
});
```

### Configurar servidor de desarrollo

```ts
export default defineConfig({
  rsbuild: {
    server: {
      port: 3000,
    },
  },
});
```

## Ejemplo de configuración completa

```ts
import { defineConfig } from "addfox";
import { pluginReact } from "@rsbuild/plugin-react";

export default defineConfig({
  plugins: [pluginReact()],
  rsbuild: {
    source: {
      alias: {
        "@": "./app",
      },
      define: {
        __VERSION__: JSON.stringify("1.0.0"),
      },
    },
    output: {
      polyfill: "usage",
    },
    performance: {
      chunkSplit: {
        strategy: "split-by-experience",
      },
    },
  },
});
```

## Notas

- La forma de objeto realiza fusión profunda
- La forma de función puede controlar completamente la configuración, pero necesitas manejar la lógica de fusión tú mismo
- Se recomienda usar `helpers.merge` para la fusión, manteniendo la configuración predeterminada del framework

## Enlaces relacionados

- [Documentación de configuración de Rsbuild](https://rsbuild.dev/config/)
- [Lista de plugins de Rsbuild](https://rsbuild.dev/plugins/list)

## Configuraciones relacionadas

- [`plugins`](/config/plugins) - Configuración de plugins de Rsbuild
