# Recarga en caliente (HMR)

El comando `addfox dev` proporciona experiencia de recarga en caliente durante el desarrollo: después de guardar el código, se reconstruye automáticamente y notifica a la extensión del navegador para recargar a través de WebSocket.

## Mecanismo de trabajo

```
Cambio en código fuente
    ↓
Rsbuild Watch reconstruye
    ↓
Construcción completada → Notificación WebSocket
    ↓
Extensión del navegador recarga
    ↓
Página se actualiza automáticamente
```

## Mecanismos de recarga en caliente para diferentes entradas

### Background / Service Worker

El script de Background usa el mecanismo de **recarga de extensión**:

1. Cambio de código → Rsbuild reconstruye
2. Construcción completada → WebSocket envía instrucción de recarga
3. Llama `chrome.runtime.reload()` para recargar toda la extensión
4. Service Worker se reinicia, carga nuevo código

:::warning Pérdida de estado
Después de que Service Worker se recarga, pierde el estado en memoria. Si necesitas persistencia de datos, usa la API `chrome.storage`.
:::

### Content Script

El Content Script usa el mecanismo de **reinyección**:

1. Cambio de código → Rsbuild reconstruye
2. Construcción completada → Extensión recarga
3. Content Script se inyecta automáticamente en páginas coincidentes
4. Las pestañas abiertas pueden recargarse automáticamente (ver configuración)

```ts
// addfox.config.ts
export default defineConfig({
  hotReload: {
    autoRefreshContentPage: true,  // Recargar página automáticamente cuando cambia content, predeterminado true
  },
});
```

:::tip Diferencia con Background
Content Script se ejecuta en el entorno de página web, después de recargar se reinyecta en páginas coincidentes, no necesitas actualizar manualmente la página de administración de extensiones.
:::

### Popup / Options / Sidepanel

Las entradas de página usan el mecanismo **Rsbuild HMR**:

1. Cambio de código → Rsbuild intenta reemplazo en caliente HMR
2. Si HMR tiene éxito → Página se actualiza localmente, estado se conserva
3. Si HMR falla → Retrocede automáticamente a actualización de página

:::tip Ventajas de HMR
- Velocidad de actualización más rápida
- Conservar estado de componentes (como entrada de formulario)
- Experiencia de desarrollo más fluida

:::

:::warning Limitación de plantillas HTML
Afectado por el mecanismo de Rsbuild, los archivos de plantilla HTML (como `popup/index.html`) no soportan verdadero reemplazo en caliente HMR.  
Cuando modifiques la plantilla HTML, Addfox retrocederá a actualización de página o recarga de extensión.
:::

## Manejo especial de Firefox

El modo de desarrollo de Firefox usa la herramienta **web-ext** para gestionar la extensión:

- La recarga de extensión es manejada por `web-ext`, no por WebSocket de Addfox
- La primera ejecución abrirá automáticamente Firefox y cargará la extensión
- Soporta recarga automática (livereload)

:::info
Al desarrollar con Firefox, asegúrate de tener instalado el navegador Firefox. Addfox llamará automáticamente `web-ext` para manejar la carga y recarga de extensiones de Firefox.
:::

## Forma de uso

```bash
# Iniciar servidor de desarrollo (HMR se habilita automáticamente)
addfox dev

# Especificar navegador objetivo
addfox dev -b chrome
addfox dev -b firefox
```

## Flujo de primera ejecución

Después de ejecutar `addfox dev`:

1. Primera construcción completada
2. Abrir navegador automáticamente según configuración
3. Cargar extensión en desarrollo
4. Abrir automáticamente páginas popup/options de la extensión (si se configuró `open`)

## Opciones de configuración

### Puerto de recarga en caliente

```ts
// addfox.config.ts
export default defineConfig({
  hotReload: {
    port: 23333,              // Puerto WebSocket, predeterminado 23333
    autoRefreshContentPage: true,  // Recargar página automáticamente cuando cambia content, predeterminado true
  },
});
```

## Siguientes pasos

- [Configuración de browserPath](/guide/launch) — Configurar navegador para abrir automáticamente durante desarrollo
- [Depuración de monitor](/guide/monitor) — Usar panel de monitoreo de errores para depurar
- [Configuración de hot-reload](/config/hot-reload) — Opciones completas de configuración de recarga en caliente
