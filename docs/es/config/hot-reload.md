# hotReload

`hotReload` se utiliza para configurar el comportamiento de recarga en caliente durante el desarrollo.

## Resumen

- **Tipo**: `{ port?: number; autoRefreshContentPage?: boolean }`
- **Valor por defecto**: `{ port: 23333, autoRefreshContentPage: true }`
- **Requerido**: No

## Uso

```ts
// addfox.config.ts
import { defineConfig } from "addfox";

export default defineConfig({
  hotReload: {
    port: 23333,                    // Puerto WebSocket
    autoRefreshContentPage: false,   // Recargar página automáticamente cuando cambia content
  },
});
```

## Opciones de configuración

### port

- **Tipo**: `number`
- **Valor por defecto**: `23333`
- **Descripción**: Puerto del servidor WebSocket, utilizado para comunicación con la extensión durante el desarrollo

```ts
export default defineConfig({
  hotReload: {
    port: 3000,  // Usar puerto 3000
  },
});
```

### autoRefreshContentPage

- **Tipo**: `boolean`
- **Valor por defecto**: `true`
- **Descripción**: Si se recarga automáticamente la pestaña actual después de cambios en el content script

```ts
export default defineConfig({
  hotReload: {
    autoRefreshContentPage: false,  // No recargar página automáticamente
  },
});
```

## Cómo funciona

1. `addfox dev` inicia el servidor WebSocket (puerto predeterminado 23333)
2. La extensión establece conexión con el servidor a través de WebSocket
3. Cambio de código → Reconstrucción → WebSocket envía instrucción de recarga
4. La extensión se recarga automáticamente, la página se actualiza

:::tip Diferencia entre Background y Content
- **Background** cambia: Toda la extensión se recarga, Service Worker se reinicia
- **Content** cambia: La extensión se recarga + se reinyecta en la página

:::

## Configuraciones relacionadas

- [guide/hmr](/guide/hmr) - Guía de recarga en caliente
