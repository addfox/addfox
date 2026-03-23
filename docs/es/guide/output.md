El producto de construcción de Addfox se envía por defecto a subdirectorios específicos del navegador bajo `.addfox/extension/` (como `extension-chromium` o `extension-firefox`).

## Estructura de salida predeterminada

```tree
.addfox/
├── extension/
│   ├── extension-chromium/  # Producto de Chromium
│   │   ├── manifest.json
│   │   ├── background/
│   │   │   └── index.js
│   │   ├── content/
│   │   │   ├── index.js
│   │   │   └── index.css
│   │   ├── popup/
│   │   │   ├── index.html
│   │   │   └── index.js
│   │   ├── options/
│   │   │   ├── index.html
│   │   │   └── index.js
│   │   └── icons/
│   │       └── icon*.png
│   └── extension-firefox/   # Producto de Firefox
└── cache/                   # Caché de desarrollo
```

## Personalizar directorio de salida

Puedes modificar el nombre del directorio de salida a través de la configuración `outDir`:

```ts
// addfox.config.ts
export default defineConfig({
  outDir: "dist",  // Salida a .addfox/dist/
});
```

## Descripción del contenido de salida

### Archivos JavaScript

- Todos los scripts de entrada empaquetados por Rsbuild
- Incluyen transformación de código, compresión (modo producción)
- Source map (modo desarrollo)

### Archivos HTML

- Generados automáticamente por Rsbuild o usando plantillas personalizadas
- Scripts de entrada correspondientes ya inyectados
- **Generación automática** de páginas (sin `index.html` personalizado) contendrá **`<div id="root"></div>`**; El **`<title>`** es consistente con el **`manifest.name`** de la extensión; El **icono de página** se referencia a través de **`<link rel="icon">`** desde **`manifest.icons`** (seleccionando el tamaño apropiado según reglas, la ruta se resuelve como relativa a la ubicación del HTML de salida). Al usar plantillas HTML personalizadas, necesitas mantener title e icono tú mismo.

### Archivos CSS

- Estilos importados desde scripts de entrada
- Procesados por PostCSS (como si se configurara Tailwind, etc.)

### Manifest

- `manifest.json` generado finalmente
- Contiene todas las rutas de entrada y configuraciones

### Recursos estáticos

- Archivos del directorio `public/` copiados tal cual
- Iconos de extensión, archivos de internacionalización, etc.

## Desarrollo vs Producción

### Modo desarrollo (`addfox dev`)

- Salida a `.addfox/extension/`
- Incluye Source map
- Código no comprimido
- El navegador carga directamente este directorio

### Modo producción (`addfox build`)

- También salida a `.addfox/extension/`
- Código comprimido y optimizado
- Puede generar archivo zip (habilitado por defecto)

## Empaquetado

Después de completar la construcción, por defecto se empaqueta como zip:

```tree
.addfox/
├── extension/          # Salida de construcción
└── extension.zip       # Archivo empaquetado (para distribución)
```

Se puede deshabilitar con `zip: false`:

```ts
export default defineConfig({
  zip: false,
});
```

## Configuraciones relacionadas

- [`outDir`](/config/out-dir) - Nombre del directorio de salida
- [`zip`](/config/zip) - Configuración de empaquetado
