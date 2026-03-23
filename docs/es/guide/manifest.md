# Configuración de Manifest

`manifest` se utiliza para declarar el manifiesto (Manifest) de la extensión de navegador, es decir, el contenido de `manifest.json` en el directorio de salida final.

Soporta tres formas de configuración:
- **Objeto en línea**: Escribir contenido del manifest directamente en la configuración
- **Dividir por navegador**: Configurar manifest de Chrome y Firefox separadamente
- **Ruta de archivo**: Especificar la ubicación del archivo manifest

También se puede **omitir completamente**, y el framework cargará automáticamente desde el directorio de código fuente.

## Tipo y comportamiento predeterminado

- **Tipo**: `ManifestConfig | ManifestPathConfig | undefined`
- **Comportamiento predeterminado**: Cuando no está configurado, el framework buscará automáticamente desde `appDir` o su subdirectorio `manifest/`:
  - `manifest.json` — Configuración base (un navegador o parte común)
  - `manifest.chromium.json` — Configuración de sobrescritura de Chrome
  - `manifest.firefox.json` — Configuración de sobrescritura de Firefox

Durante la construcción, el framework fusionará según el navegador objetivo especificado en CLI (`-b chrome|firefox`) y generará en `outputRoot/outDir/manifest.json`.

## Formas de configuración

### 1. Objeto único (un navegador o configuración común)

Todos los campos se escriben en un objeto, el framework inyectará automáticamente las rutas de entrada.

```ts
// addfox.config.ts
import { defineConfig } from "addfox";

export default defineConfig({
  manifest: {
    name: "Mi Extensión",
    version: "1.0.0",
    manifest_version: 3,
    permissions: ["storage", "activeTab"],
  },
});
```

El framework generará e inyectará automáticamente las rutas según la configuración de entrada:
- `action.default_popup` → `popup/index.html`
- `background.service_worker` → `background/index.js`
- `content_scripts` → `content/index.js`

> Las rutas de entrada (como `popup/index.html`) se calculan automáticamente por el framework según [entry](/es/guide/entry/file-based) y [outDir](/es/config/out-dir), solo necesitas mantener la semántica correcta de los campos en el manifest.

### 2. Dividir por navegador (chromium / firefox)

Cuando Chrome y Firefox necesitan diferentes configuraciones de manifest:

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
      permissions: ["storage"],
    },
    firefox: {
      name: "Mi Extensión",
      version: "1.0.0",
      manifest_version: 3,
      action: { default_popup: "popup/index.html" },
      background: { service_worker: "background/index.js" },
      permissions: ["storage"],
    },
  },
});
```

Durante la construcción se selecciona la rama correspondiente según el parámetro de CLI:
- `addfox dev -b chrome` → Usar rama `chromium`
- `addfox dev -b firefox` → Usar rama `firefox`

### 3. Configuración de ruta (relativa a appDir)

Guarda el manifest en archivos JSON independientes:

```ts
// addfox.config.ts
export default defineConfig({
  manifest: {
    chromium: "manifest/manifest.chromium.json",
    firefox: "manifest/manifest.firefox.json",
  },
});
```

La ruta del archivo es relativa a [`appDir`](/es/config/app-dir).

### 4. Omitir completamente (carga automática)

Cuando no escribes la configuración `manifest`, el framework buscará en el siguiente orden:

1. `appDir/manifest.json`
2. `appDir/manifest/manifest.json`
3. `appDir/manifest/manifest.chromium.json`
4. `appDir/manifest/manifest.firefox.json`

**Estructura de archivos recomendada**:

```
app/
├── manifest/
│   ├── manifest.json           # Configuración base
│   ├── manifest.chromium.json  # Sobrescritura de Chrome
│   └── manifest.firefox.json   # Sobrescritura de Firefox
├── background/
├── content/
└── popup/
```

## Ejemplo completo

### Configuración de soporte de doble navegador

```ts
// addfox.config.ts
import { defineConfig } from "addfox";

export default defineConfig({
  manifest: {
    chromium: {
      name: "Administrador de pestañas",
      version: "1.0.0",
      description: "Gestiona pestañas del navegador eficientemente",
      manifest_version: 3,
      permissions: ["tabs", "storage"],
      icons: {
        16: "icons/icon16.png",
        48: "icons/icon48.png",
        128: "icons/icon128.png",
      },
      action: {
        default_popup: "popup/index.html",
        default_icon: {
          16: "icons/icon16.png",
        },
      },
      background: {
        service_worker: "background/index.js",
      },
      content_scripts: [
        {
          matches: ["<all_urls>"],
          js: ["content/index.js"],
          run_at: "document_end",
        },
      ],
    },
    
    firefox: {
      name: "Administrador de pestañas",
      version: "1.0.0",
      description: "Gestiona pestañas del navegador eficientemente",
      manifest_version: 3,
      permissions: ["tabs", "storage"],
      icons: {
        16: "icons/icon16.png",
        48: "icons/icon48.png",
        128: "icons/icon128.png",
      },
      action: {
        default_popup: "popup/index.html",
        default_icon: {
          16: "icons/icon16.png",
        },
      },
      background: {
        service_worker: "background/index.js",
      },
      content_scripts: [
        {
          matches: ["<all_urls>"],
          js: ["content/index.js"],
          run_at: "document_end",
        },
      ],
    },
  },
});
```

## Configuraciones relacionadas

- [entry](/es/guide/entry/file-based) — Reglas de descubrimiento de entradas
- [appDir](/es/config/app-dir) — Configuración del directorio de aplicación
- [outDir](/es/config/out-dir) — Configuración del directorio de salida
