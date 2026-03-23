# Configuración de Rsbuild

Addfox se basa en [Rsbuild](https://rsbuild.dev/) para la construcción, puedes personalizar completamente la configuración de construcción.

## Forma de configuración

Usa el campo `rsbuild` en `addfox.config.ts`:

```ts
// addfox.config.ts
import { defineConfig } from "addfox";

export default defineConfig({
  rsbuild: {
    // Tu configuración de Rsbuild
  },
});
```

## Configuraciones comunes

### Alias de rutas

Simplificar rutas de importación de módulos:

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

Uso:

```ts
import { Button } from "@/components/Button";
import { formatDate } from "@/utils/date";
```

### Definir variables globales

Inyectar constantes globales en tiempo de compilación:

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

Uso en código:

```ts
console.log(__VERSION__);  // "1.0.0"
console.log(__DEV__);      // true / false
```

### Configuración CSS

#### CSS Modules

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

#### Sass

Instalar plugin:

```bash
pnpm add -D @rsbuild/plugin-sass sass
```

Configuración:

```ts
import { pluginSass } from "@rsbuild/plugin-sass";

export default defineConfig({
  plugins: [pluginSass()],
});
```

Ver [Guía de integración de Sass](/guide/style-integration/sass) para más detalles.

#### Less

Instalar plugin:

```bash
pnpm add -D @rsbuild/plugin-less less
```

Configuración:

```ts
import { pluginLess } from "@rsbuild/plugin-less";

export default defineConfig({
  plugins: [pluginLess()],
});
```

Ver [Guía de integración de Less](/guide/style-integration/less) para más detalles.

#### Tailwind CSS

Ver [Guía de integración de Tailwind CSS](/guide/style-integration/tailwindcss) para más detalles.

### Optimización de construcción

#### División de código

```ts
export default defineConfig({
  rsbuild: {
    performance: {
      chunkSplit: {
        strategy: "split-by-experience",
      },
    },
  },
});
```

#### Inlining de recursos

```ts
export default defineConfig({
  rsbuild: {
    output: {
      dataUriLimit: {
        svg: 4096,      // Inline SVG menor a 4KB
        font: 4096,     // Inline fuentes menor a 4KB
      },
    },
  },
});
```

## Configuración en forma de función

Usar cuando se necesita control completo de la configuración:

```ts
export default defineConfig({
  rsbuild: (base, helpers) => {
    // base: Configuración predeterminada
    // helpers.merge: Herramienta de fusión profunda
    
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

## Agregar plugins

```ts
import { pluginReact } from "@rsbuild/plugin-react";
import { pluginSvgr } from "@rsbuild/plugin-svgr";

export default defineConfig({
  plugins: [
    pluginReact(),
    pluginSvgr(),
  ],
});
```

## Ejemplo completo

```ts
import { defineConfig } from "addfox";
import { pluginReact } from "@rsbuild/plugin-react";

export default defineConfig({
  manifest: {
    name: "Mi Extensión",
    version: "1.0.0",
    manifest_version: 3,
  },
  
  plugins: [pluginReact()],
  
  rsbuild: {
    source: {
      alias: {
        "@": "./app",
        "@/components": "./app/components",
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
    
    tools: {
      // Configuración de herramientas personalizada
    },
  },
});
```

## Notas

- La configuración se fusionará profundamente con la configuración predeterminada de Addfox
- La forma de función puede controlar completamente la configuración, pero necesitas manejar la fusión tú mismo
- Se recomienda usar `helpers.merge` para mantener la configuración predeterminada del framework

## Enlaces relacionados

- [Documentación de configuración de Rsbuild](https://rsbuild.dev/config/)
- [Lista de plugins de Rsbuild](https://rsbuild.dev/plugins/list)

## Configuraciones relacionadas

- [`plugins`](/config/plugins) - Configuración de plugins de Rsbuild
