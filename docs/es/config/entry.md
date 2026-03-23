# entry

`entry` se utiliza para personalizar el mapeo de entradas de la extensión. Cuando no está configurado, el framework descubrirá las entradas automáticamente desde el directorio de la aplicación.

## Resumen

- **Tipo**: `Record<string, EntryConfigValue> | undefined`
- **Valor por defecto**: `undefined` (descubrimiento automático)
- **Requerido**: No

```ts
type EntryConfigValue = 
  | string                           // Ruta del script
  | { src: string; html?: boolean | string };  // Forma de objeto
```

## Nombres de entrada reservados

Los siguientes nombres tienen significados especiales y se utilizan para las entradas estándar de extensiones de navegador:

| Nombre de entrada | Tipo | Descripción |
|--------|------|------|
| `background` | Solo script | Service Worker / Script de fondo |
| `content` | Solo script | Content Script |
| `popup` | Script + HTML | Página emergente |
| `options` | Script + HTML | Página de opciones |
| `sidepanel` | Script + HTML | Panel lateral |
| `devtools` | Script + HTML | Página de herramientas de desarrollador |
| `offscreen` | Script + HTML | Documento Offscreen |

## Formas de configuración

### Forma de cadena

El valor es la ruta del script relativa a baseDir (predeterminado `app/`).

```ts
export default defineConfig({
  entry: {
    background: "background/index.ts",
    content: "content/index.ts",
    popup: "popup/index.tsx",
  },
});
```

### Forma de objeto

Control más detallado:

```ts
export default defineConfig({
  entry: {
    // Generar HTML automáticamente
    popup: { src: "popup/index.tsx", html: true },
    
    // Usar plantilla HTML personalizada
    options: { src: "options/index.tsx", html: "options/template.html" },
    
    // Solo script (sin generar HTML)
    worker: { src: "worker/index.ts", html: false },
  },
});
```

### Entradas personalizadas

Además de los nombres reservados, puedes agregar cualquier nombre como entrada de página personalizada:

```ts
export default defineConfig({
  entry: {
    // Entradas integradas
    background: "background/index.ts",
    popup: "popup/index.tsx",
    
    // Entradas personalizadas
    capture: { src: "pages/capture/index.tsx", html: true },
    welcome: { src: "pages/welcome/index.tsx", html: true },
  },
});
```

Las entradas personalizadas producirán páginas independientes, accesibles a través de `chrome-extension://<id>/capture/index.html`.

## Reglas de rutas

- Todas las rutas son **relativas a baseDir** (determinado por [`appDir`](/config/app-dir), predeterminado `app/`)
- La entrada debe ser un script `.js`, `.jsx`, `.ts`, `.tsx`
- Al usar una plantilla HTML personalizada, debes marcar el script de entrada mediante `data-addfox-entry`

## Relación con el descubrimiento automático

- Configurado `entry`: Solo usa las entradas declaradas en `entry`
- No configurado `entry`: Descubre automáticamente las entradas en el directorio `app/`
- Uso mixto: Las entradas configuradas en `entry` sobrescriben las entradas del mismo nombre descubiertas automáticamente

## Ejemplos

### Sobrescribir algunas entradas

```ts
export default defineConfig({
  entry: {
    // Sobrescribir la ruta de popup
    popup: "pages/popup/main.tsx",
    // background y content siguen siendo descubiertos automáticamente
  },
});
```

### Configuración completa

```ts
export default defineConfig({
  appDir: "src",
  entry: {
    background: "background/index.ts",
    content: "content/index.ts",
    popup: { src: "popup/index.tsx", html: true },
    options: { src: "options/index.tsx", html: "options/index.html" },
    capture: { src: "capture/index.tsx", html: true },
  },
});
```

## Configuraciones relacionadas

- [`appDir`](/config/app-dir) - Directorio de la aplicación
- [guide/entry/concept](/guide/entry/concept) - Explicación detallada del concepto de entrada
- [guide/entry/file-based](/guide/entry/file-based) - Descubrimiento de entradas basado en archivos
- [guide/entry/config-based](/guide/entry/config-based) - Entradas basadas en configuración
