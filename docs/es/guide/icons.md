# Iconos

Las extensiones de navegador necesitan un conjunto de iconos para la barra de herramientas, página de administración de extensiones y Web Store.

## Tamaños de iconos

Chrome recomienda los siguientes tamaños:

| Tamaño | Uso |
|------|------|
| 16x16 | Icono de barra de herramientas (Favicon) |
| 32x32 | Icono de barra de herramientas (Retina) |
| 48x48 | Página de administración de extensiones |
| 128x128 | Web Store y aviso de instalación |

Firefox soporta adicionalmente:

| Tamaño | Uso |
|------|------|
| 19x19 | Icono de barra de herramientas |
| 38x38 | Icono de barra de herramientas (Retina) |
| 96x96 | Página de administración de extensiones |

## Estructura de directorios

Coloca los iconos en `public/icons/`:

```tree
public/
└── icons/
    ├── icon16.png
    ├── icon32.png
    ├── icon48.png
    └── icon128.png
```

## Configuración en Manifest

```json
{
  "icons": {
    "16": "icons/icon16.png",
    "32": "icons/icon32.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  },
  "action": {
    "default_icon": {
      "16": "icons/icon16.png",
      "32": "icons/icon32.png"
    }
  }
}
```

## Configurar icono dinámicamente

En el código puedes cambiar el icono dinámicamente:

```ts
// Establecer icono de barra de herramientas
chrome.action.setIcon({
  path: {
    16: "icons/icon-active16.png",
    32: "icons/icon-active32.png",
  },
});

// Establecer título
chrome.action.setTitle({ title: "Active Mode" });

// Establecer insignia
chrome.action.setBadgeText({ text: "3" });
chrome.action.setBadgeBackgroundColor({ color: "#FF0000" });
```

## Adaptación a modo oscuro

Proporciona diferentes iconos para diferentes temas:

```ts
// Detectar tema del sistema y establecer icono correspondiente
if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
  chrome.action.setIcon({
    path: {
      16: "icons/icon-dark16.png",
      32: "icons/icon-dark32.png",
    },
  });
}
```

## Recomendaciones de diseño de iconos

1. **Simple y claro** — Reconocible en tamaños pequeños
2. **Consistente con la marca** — Relacionado con la función de extensión o marca
3. **Alto contraste** — Claramente visible en diferentes fondos
4. **Evitar texto** — Texto difícil de reconocer en tamaños pequeños
5. **Usar PNG** — Soporta fondo transparente

## Iconos SVG

Chrome también soporta iconos SVG:

```json
{
  "icons": {
    "16": "icons/icon16.svg",
    "32": "icons/icon32.svg"
  }
}
```

Pero algunos escenarios (como Web Store) aún necesitan PNG, se recomienda proporcionar ambos.

## Herramientas de generación de iconos

- [Figma](https://figma.com/) — Diseñar iconos y exportar múltiples tamaños
- [Icon Kitchen](https://icon.kitchen/) — Generar iconos de extensión en línea
- [RealFaviconGenerator](https://realfavicongenerator.net/) — Generar iconos de múltiples tamaños

## Ejemplo completo

```ts
// addfox.config.ts
export default defineConfig({
  manifest: {
    name: "Mi Extensión",
    icons: {
      16: "icons/icon16.png",
      32: "icons/icon32.png",
      48: "icons/icon48.png",
      128: "icons/icon128.png",
    },
    action: {
      default_icon: {
        16: "icons/icon16.png",
        32: "icons/icon32.png",
      },
    },
  },
});
```

## Enlaces relacionados

- [Especificaciones de iconos de Chrome](https://developer.chrome.com/docs/extensions/mv3/user_interface/#icons)
- [Requisitos de iconos de Chrome Web Store](https://developer.chrome.com/docs/webstore/images/#icons)
