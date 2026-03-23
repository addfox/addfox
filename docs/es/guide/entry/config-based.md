# Entradas basadas en configuración

Al usar `entry` y `manifest` en `addfox.config.ts` para la configuración basada en control, puedes:
- Personalizar rutas de entrada
- Sobrescribir resultados de descubrimiento automático
- Agregar **entradas personalizadas** (como `capture`, `my-page`, etc.)

Las entradas no listadas en `entry` aún se descubrirán automáticamente a través de las [reglas basadas en archivos](/guide/entry/file-based).

## Principios fundamentales

Consistente con las entradas basadas en archivos:
- **La entrada debe ser JS/TS**: La construcción se basa en Rsbuild, la entrada real solo puede ser archivos de script
- **Manejo de HTML**: Las entradas HTML integradas (popup/options, etc.) se generan automáticamente; cuando se usa plantilla HTML personalizada, el script de entrada debe marcarse mediante `data-addfox-entry`
- **Al generar HTML automáticamente** (sin plantilla personalizada): La página contiene **`<div id="root"></div>`**; El **`<title>`** usa **`manifest.name`**; El **favicon** se inyecta a través de **`<link rel="icon">`** usando las rutas en **`manifest.icons`**. Al personalizar `index.html`, estos dos elementos no se inyectan automáticamente, necesitas escribirlos tú mismo.

## Formas de escritura de configuración

### 1) Configurar entradas a través de `entry`

`entry` es un objeto: **clave = nombre de entrada, valor = ruta o objeto de configuración**.

### 2) Configurar campos relacionados con entradas a través de `manifest`

En `manifest` puedes declarar campos de capacidad relacionados con entradas (como `background`, `action.default_popup`, `content_scripts`):

```ts
export default defineConfig({
  manifest: {
    manifest_version: 3,
    background: { service_worker: "background/index.js" },
    action: { default_popup: "popup/index.html" },
    content_scripts: [
      { matches: ["<all_urls>"], js: ["content/index.js"] },
    ],
  },
});
```

### 3) Prioridad entre `entry` y `manifest`

Cuando ambos participan en la resolución de entradas, la prioridad es:

1. Configuración explícita en `entry`
2. Campos relacionados con entradas en `manifest`
3. Descubrimiento automático (basado en archivos)

Es decir: `entry` sobrescribe entradas del mismo nombre de otras fuentes.

### Ruta de cadena (recomendado)

El valor es la ruta **relativa a baseDir** (predeterminado `app/`):

| Tipo de valor | Significado | Ejemplo |
|--------|------|------|
| Ruta de script `.ts/.tsx` | Usar ese script como entrada; Las entradas HTML integradas generarán HTML automáticamente o usarán `index.html` en el mismo directorio como plantilla | `"popup/index.ts"` |
| Ruta de HTML `.html` | Usar ese HTML como plantilla; Debe analizar el script de entrada mediante `data-addfox-entry` | `"popup/index.html"` |

### Forma de objeto: `{ src, html? }`

Control más detallado:

| Campo | Tipo | Descripción |
|------|------|------|
| `src` | `string` | Ruta del script de entrada (relativa a baseDir) **Requerido** |
| `html` | `boolean \| string` | `true`: Generar HTML sin plantilla; `false`: Solo script; `string`: Especificar ruta de plantilla HTML |

## Entradas integradas y rutas de salida

Al configurar entradas integradas a través de `entry`, las rutas de salida predeterminadas son:

| Nombre de entrada | Tipo | Script de salida | HTML de salida |
|--------|------|----------|-----------|
| `background` | Solo script | `background/index.js` | — |
| `content` | Solo script | `content/index.js` | — |
| `popup` | Script+HTML | `popup/index.js` | `popup/index.html` |
| `options` | Script+HTML | `options/index.js` | `options/index.html` |
| `sidepanel` | Script+HTML | `sidepanel/index.js` | `sidepanel/index.html` |
| `devtools` | Script+HTML | `devtools/index.js` | `devtools/index.html` |
| `offscreen` | Script+HTML | `offscreen/index.js` | `offscreen/index.html` |

:::info
En el manifest, el framework llenará automáticamente campos como `action.default_popup`, `options_page`, etc. usando las rutas anteriores.
:::

## Ejemplos de configuración

### Sobrescribir algunas entradas

```ts
// addfox.config.ts
import { defineConfig } from "addfox";

export default defineConfig({
  entry: {
    // Solo sobrescribir estas entradas, otras siguen descubriéndose automáticamente
    popup: "popup/main.tsx",
    options: "options/settings.tsx",
  },
});
```

### Configurar todas las entradas completamente

```ts
export default defineConfig({
  appDir: "src",
  entry: {
    background: "background/index.ts",
    content: "content/index.ts",
    popup: "popup/index.tsx",
    options: "options/index.tsx",
    sidepanel: "sidepanel/index.tsx",
  },
});
```

### Entrada personalizada + forzar generación de HTML

```ts
export default defineConfig({
  entry: {
    // Entrada integrada
    background: "background/index.ts",
    content: "content/index.ts",
    popup: "popup/index.tsx",
    
    // Entrada de página personalizada (generar HTML automáticamente)
    capture: { src: "pages/capture/index.tsx", html: true },
    
    // Entrada de página personalizada (usar plantilla)
    welcome: { src: "pages/welcome/index.tsx", html: "pages/welcome/template.html" },
    
    // Entrada solo script (sin HTML)
    worker: { src: "worker/index.ts", html: false },
  },
});
```

### Deshabilitar descubrimiento automático de entradas

Si necesitas controlar completamente todas las entradas manualmente:

```ts
export default defineConfig({
  entry: {
    background: "background/index.ts",
    content: "content/index.ts",
    popup: "popup/index.tsx",
    // ... Listar todas las entradas necesarias
  },
  // Mantener las opciones de configuración no deseadas sin definir, el framework solo procesará las entradas listadas en entry
});
```

## Reglas de resolución de rutas

### Relativo a baseDir

Todas las rutas en `entry` son **relativas a baseDir**, baseDir está determinado por [`appDir`](/config/app-dir) (predeterminado `app`):

```ts
export default defineConfig({
  appDir: "src",                    // baseDir = src/
  entry: {
    popup: "popup/index.ts",        // Apunta a src/popup/index.ts
  },
});
```

### Tabla rápida de rutas

| Forma de configuración | Ubicación del script de entrada | Salida típica |
|----------|--------------|----------|
| `background: "background/index.ts"` | `app/background/index.ts` | `extension/background/index.js` |
| `content: "content.ts"` | `app/content.ts` | `extension/content.js` |
| `popup: "popup/index.ts"` | `app/popup/index.ts` | `extension/popup/index.html` + `extension/popup/index.js` |
| `capture: { src: "capture/index.ts", html: true }` | `app/capture/index.ts` | `extension/capture/index.html` + `extension/capture/index.js` |

## Siguientes pasos

- [Entradas basadas en archivos](/es/guide/entry/file-based) — Conocer las reglas de descubrimiento automático
- [Configuración de appDir](/es/config/app-dir) — Modificar el directorio de código fuente
- [Configuración de manifest](/es/config/manifest) — Configurar el manifiesto de extensión
