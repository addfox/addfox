# Concepto de entrada

**Entry (Entrada)** corresponde a los varios módulos funcionales de la extensión del navegador, como scripts de fondo, scripts de contenido, páginas emergentes, etc. Addfox proporciona tres formas de configuración, que puedes usar individualmente o en combinación.

## Qué es una entrada

Las extensiones de navegador están compuestas por múltiples módulos funcionales independientes, cada uno necesita un archivo de entrada:

| Tipo de entrada | Concepto de extensión de navegador correspondiente | Uso típico |
|----------|-------------------|----------|
| `background` | Service Worker / Script de fondo | Manejar ciclo de vida de extensión, comunicación entre páginas |
| `content` | Content Script | Manipular DOM de página web, interactuar con la página |
| `popup` | Página emergente | Interfaz emergente después de hacer clic en el icono de la barra de herramientas |
| `options` | Página de opciones | Interfaz de configuración de la extensión |
| `sidepanel` | Panel lateral | Panel lateral de Chrome |
| `devtools` | Herramientas de desarrollador | Panel personalizado de DevTools |
| `offscreen` | Documento Offscreen | Tareas de fondo que necesitan API DOM |

Para las entradas que necesitan HTML como **`popup` / `options` / `sidepanel` / `devtools` / `offscreen`**: Si **no proporcionas** un `index.html` personalizado, la construcción **generará automáticamente** la página, que contiene **`<div id="root"></div>`**; El **`<title>`** es consistente con **`manifest.name`**; El **icono de pestaña** usa **`manifest.icons`** a través de **`<link rel="icon">`**. Cuando uses plantillas HTML personalizadas, debes escribir title, icono y nodo de montaje tú mismo (ver [Entradas basadas en archivos](/guide/entry/file-based) para más detalles).

## Formas de configuración

### Método 1: Basado en archivos (recomendado)

**No configurar `entry`**, el framework descubre automáticamente las entradas según directorios y nombres de archivo.

```tree
app/
├── background/
│   └── index.ts      # → entrada background
├── content/
│   └── index.ts      # → entrada content
├── popup/
│   └── index.ts      # → entrada popup
└── ...
```

Ventajas:
- Configuración cero, solo sigue las convenciones
- Agregar entradas solo requiere crear el directorio correspondiente
- Estructura de código clara

Ver [Entradas basadas en archivos](/guide/entry/file-based) para más detalles.

### Método 2: Basado en configuración (entry + manifest)

Configura las capacidades relacionadas con entradas a través de `entry` y `manifest` en `addfox.config.ts`:

```ts
export default defineConfig({
  entry: {
    background: "background/index.ts",
    content: "content/index.ts",
    popup: "popup/index.ts",
  },
  manifest: {
    manifest_version: 3,
    action: { default_popup: "popup/index.html" },
  },
});
```

Ventajas:
- Entradas y configuración de manifiesto gestionadas centralmente
- Soporte para nombres de entrada personalizados
- Puede sobrescribir resultados de descubrimiento automático

Ver [Entradas basadas en configuración](/es/guide/entry/config-based) y [Configuración de manifest](/es/config/manifest) para más detalles.

### Uso mixto

Las tres formas se pueden usar en combinación, con la siguiente prioridad:

1. **Máxima**: Entradas configuradas en `config.entry`
2. **Segunda**: Rutas de archivos fuente especificadas en el manifest
3. **Tercera**: Descubrimiento automático

```ts
export default defineConfig({
  entry: {
    // Máxima prioridad: sobrescribe todas las demás configuraciones
    popup: "pages/popup/main.ts",
  },
  manifest: {
    // Segunda prioridad: usada cuando entry no especifica
    background: { service_worker: "./background/index.ts" },
    // popup usa la configuración de entry, no esta
    action: { default_popup: "./popup/index.ts" },
  },
  // Tercera prioridad: descubre automáticamente entradas no configuradas
});
```

## Principios fundamentales

### La entrada debe ser JS/TS

Addfox se basa en **Rsbuild** para la construcción, las entradas reales de construcción solo pueden ser archivos de script `.js`, `.jsx`, `.ts`, `.tsx`.

### Manejo de HTML

- **Entradas que no necesitan HTML**: `background`, `content` solo necesitan archivos de script
- **Entradas que necesitan HTML**: `popup`, `options`, `sidepanel`, `devtools`, `offscreen`
  - Si no proporcionas HTML, Rsbuild generará automáticamente (contiene `<div id="root"></div>`)
  - Si proporcionas una plantilla HTML personalizada, debes marcar el script de entrada mediante `data-addfox-entry` en la plantilla

### Ejemplo: Plantilla HTML personalizada

```html
<!-- app/popup/index.html -->
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>Ventana emergente</title>
  </head>
  <body>
    <div id="root"></div>
    <!-- Marcar entrada mediante data-addfox-entry -->
    <script type="module" data-addfox-entry src="./index.ts"></script>
  </body>
</html>
```

## Entradas integradas y entradas personalizadas

### Entradas integradas (nombres reservados)

Los siguientes nombres tienen significados especiales, Addfox los reconoce y procesa automáticamente:

| Nombre de entrada | Descripción |
|--------|------|
| `background` | Service Worker (MV3) o página de fondo (MV2) |
| `content` | Script de contenido |
| `popup` | Ventana emergente de barra de herramientas |
| `options` | Página de opciones de extensión |
| `sidepanel` | Panel lateral |
| `devtools` | Herramientas de desarrollador |
| `offscreen` | Documento Offscreen |

:::warning
Los nombres de entradas integradas no se pueden modificar. El framework depende de estos nombres para el reconocimiento automático y el llenado de rutas en el manifest.
:::

### Entradas personalizadas

Además de las entradas integradas, puedes configurar cualquier nombre en `entry` como **entrada personalizada** (como `capture`, `my-page`):

```ts
export default defineConfig({
  entry: {
    capture: { src: "capture/index.ts", html: true },
  },
});
```

Las entradas personalizadas producirán páginas independientes, accesibles a través de `chrome-extension://<id>/capture/index.html`.

## Siguientes pasos

- [Entradas basadas en archivos](/es/guide/entry/file-based) — Aprender las reglas de descubrimiento de entradas basadas en convenciones
- [Entradas basadas en configuración](/es/guide/entry/config-based) — Saber cómo configurar entry + manifest explícitamente
- [Configuración de manifest](/es/config/manifest) — Configurar capacidades de extensión en el manifest
