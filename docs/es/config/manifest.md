# manifest

`manifest` se utiliza para declarar el manifiesto (Manifest) de la extensión del navegador, es decir, el contenido de `manifest.json` en el directorio de salida final.

## Resumen

- **Tipo**: `ManifestConfig | ManifestPathConfig | undefined`
- **Valor por defecto**: `undefined` (carga automática)
- **Requerido**: No

## Formas de configuración

### 1. Objeto en línea (un solo navegador)

La forma más simple de configuración, adecuada cuando solo se admite un navegador o cuando la configuración de ambos navegadores es la misma.

```ts
// addfox.config.ts
import { defineConfig } from "addfox";

export default defineConfig({
  manifest: {
    name: "Mi Extensión",
    version: "1.0.0",
    manifest_version: 3,
    permissions: ["storage", "activeTab"],
    action: { default_popup: "popup/index.html" },
    background: { service_worker: "background/index.js" },
    content_scripts: [
      { matches: ["<all_urls>"], js: ["content/index.js"] },
    ],
  },
});
```

### 2. Dividir por navegador (chromium / firefox)

Úsalo cuando Chrome y Firefox necesitan configuraciones diferentes.

```ts
// addfox.config.ts
export default defineConfig({
  manifest: {
    chromium: {
      name: "Mi Extensión",
      version: "1.0.0",
      manifest_version: 3,
      action: { default_popup: "popup/index.html" },
      background: { service_worker: "background/index.js" },
    },
    
    firefox: {
      name: "Mi Extensión",
      version: "1.0.0",
      manifest_version: 3,
      action: { default_popup: "popup/index.html" },
      background: { service_worker: "background/index.js" },
    },
  },
});
```

### 3. Configuración de ruta de archivo

Guarda el manifest en archivos JSON independientes.

```ts
// addfox.config.ts
export default defineConfig({
  manifest: {
    chromium: "manifest/manifest.chromium.json",
    firefox: "manifest/manifest.firefox.json",
  },
});
```

La ruta es relativa a [`appDir`](/config/app-dir).

### 4. Carga automática (recomendado)

Cuando no escribes la configuración `manifest`, el framework buscará automáticamente:

1. `appDir/manifest.json`, `appDir/manifest.chromium.json`, `appDir/manifest.firefox.json`
2. `appDir/manifest/manifest.json`, `appDir/manifest/manifest.chromium.json`, `appDir/manifest/manifest.firefox.json`

Cualquier archivo encontrado se usará como base y se fusionará con los archivos chromium/firefox en el mismo directorio.
## Especificar archivos fuente de entrada directamente en el Manifest

Desde addfox 1.x, puedes especificar **rutas de archivos fuente** de entradas directamente en el manifest, el framework las reconocerá y construirá automáticamente, reemplazando las rutas con las rutas de los productos.

```ts
// addfox.config.ts
export default defineConfig({
  manifest: {
    name: "Mi Extensión",
    version: "1.0.0",
    manifest_version: 3,
    
    // Especificar directamente rutas de archivos fuente en el manifest
    background: {
      service_worker: "./background/index.ts",  // Ruta de archivo fuente
    },
    action: {
      default_popup: "./popup/index.tsx",       // Ruta de archivo fuente
    },
    content_scripts: [
      {
        matches: ["<all_urls>"],
        js: ["./content/index.ts"],              // Ruta de archivo fuente
      },
    ],
  },
});
```

El framework:
1. Reconoce estas rutas de archivos fuente (`.ts`, `.tsx`, `.js`, `.jsx`)
2. Las procesa automáticamente como entry
3. Reemplaza las rutas con rutas de productos después de la construcción (como `background/index.js`)

### Campos de entrada soportados

Puedes usar rutas de archivos fuente en los siguientes campos del manifest:

| Campo | Descripción |
|------|------|
| `background.service_worker` | Script de fondo MV3 |
| `background.scripts` | Scripts de fondo MV2 |
| `background.page` | Página de fondo |
| `action.default_popup` | Página emergente MV3 |
| `browser_action.default_popup` | Página emergente MV2 |
| `options_ui.page` / `options_page` | Página de opciones |
| `devtools_page` | Página de herramientas de desarrollador |
| `side_panel.default_path` | Panel lateral |
| `sandbox.pages` | Páginas de sandbox |
| `chrome_url_overrides.newtab` | Nueva pestaña |
| `chrome_url_overrides.bookmarks` | Página de marcadores |
| `chrome_url_overrides.history` | Página de historial |
| `content_scripts[].js` | Scripts de contenido |

### Prioridad de resolución de entradas

La prioridad del framework para resolver entradas es la siguiente:

1. **Máxima**: Entradas configuradas explícitamente en `config.entry`
2. **Segunda**: Rutas de archivos fuente especificadas en el manifest
3. **Tercera**: Descubrimiento automático (basado en convenciones de archivos)

Esto significa:
- Si especificas una entrada en `config.entry`, las rutas de archivos fuente en el manifest se ignoran
- Si no configuras `config.entry` pero hay rutas de archivos fuente en el manifest, el framework usa las rutas del manifest
- Si ninguna de las anteriores, el framework descubre automáticamente las entradas según las convenciones

```ts
// Ejemplo: config.entry tiene la máxima prioridad
export default defineConfig({
  entry: {
    // Esta configuración sobrescribe la ruta de archivo fuente de background en el manifest
    background: "custom-background/index.ts",
  },
  manifest: {
    background: {
      service_worker: "./background/index.ts",  // Será sobrescrito por config.entry
    },
  },
});
```

## Definiciones de tipos

```ts
type ManifestConfig = 
  | Record<string, unknown>           // Objeto único
  | { chromium?: Record<string, unknown>; firefox?: Record<string, unknown> };  // Dividido

type ManifestPathConfig = {
  chromium?: string;   // Ruta relativa a appDir
  firefox?: string;    // Ruta relativa a appDir
};
```

## Notas

1. Las rutas de entrada (como `popup/index.html`) se calculan automáticamente por el framework según [`entry`](/config/entry) y [`outDir`](/config/out-dir)
2. Usa CLI `-b chrome|firefox` para seleccionar la rama correspondiente para construir
3. El framework inyecta automáticamente las rutas de entrada como `background`, `content_scripts`, `action`, etc. en el manifest
4. Cuando uses rutas de archivos fuente en el manifest, asegúrate de que los archivos existan, de lo contrario la construcción fallará

## Ejemplos

### Soporte de doble navegador

```ts
export default defineConfig({
  manifest: {
    chromium: {
      name: "Administrador de pestañas",
      version: "1.0.0",
      manifest_version: 3,
      permissions: ["tabs", "storage"],
      action: { default_popup: "popup/index.html" },
      background: { service_worker: "background/index.js" },
      content_scripts: [
        { matches: ["<all_urls>"], js: ["content/index.js"] },
      ],
    },
    
    firefox: {
      name: "Administrador de pestañas",
      version: "1.0.0",
      manifest_version: 3,
      permissions: ["tabs", "storage"],
      action: { default_popup: "popup/index.html" },
      background: { service_worker: "background/index.js" },
      content_scripts: [
        { matches: ["<all_urls>"], js: ["content/index.js"] },
      ],
    },
  },
});
```

### Configuración pura de entrada de Manifest (sin config.entry)

```ts
export default defineConfig({
  // No configurar entry, depender completamente de las rutas de archivos fuente en el manifest
  manifest: {
    name: "Ejemplo de configuración pura de Manifest",
    version: "1.0.0",
    manifest_version: 3,
    background: {
      service_worker: "./src/background.ts",
    },
    action: {
      default_popup: "./src/popup.tsx",
    },
    content_scripts: [
      {
        matches: ["<all_urls>"],
        js: ["./src/content.ts"],
      },
    ],
  },
});
```

## Configuraciones relacionadas

- [`entry`](/config/entry) - Configuración de entradas
- [`appDir`](/config/app-dir) - Directorio de la aplicación
- [`outDir`](/config/out-dir) - Directorio de salida
