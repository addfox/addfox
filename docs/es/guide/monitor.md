# Monitoreo de errores

Addfox puede inyectar capacidad de monitoreo de errores en modo de desarrollo, agregando errores en tiempo de ejecución de múltiples entradas al terminal y página de monitoreo para facilitar la ubicación rápida.

## Valor principal

- Capturar automáticamente errores de entradas como `background`, `content`, `popup`, `options`, `sidepanel`
- Salida de bloque de error estructurado en terminal (entrada, mensaje, ubicación, pila), más adecuado para análisis directo por AI
- Proporcionar página de monitoreo (`/_addfox-monitor/`) para ver lista de errores y detalles

## Forma de habilitar

Bajo `addfox dev` habilitar:

```ts
// addfox.config.ts
export default defineConfig({
  debug: true,
});
```

O habilitar temporalmente desde línea de comandos:

```bash
addfox dev --debug
```

## Salida amigable para AI en terminal

Cuando el monitoreo está habilitado, Addfox mostrará en el terminal el contexto de error conveniente para uso de AI, generalmente incluyendo:

- Entrada (entry)
- Mensaje de error (message)
- Ubicación de ocurrencia (location)
- Pila (stack)

Puedes copiar directamente este bloque de error al AI, reduciendo el costo de ida y vuelta para complementar contexto.

## Notas de Firefox

El mecanismo de ejecución de extensiones de Firefox es diferente al de Chromium (especialmente el ciclo de vida del script de fondo y el canal de depuración), por lo tanto el comportamiento de monitoreo de errores puede no ser completamente consistente con el de Chromium.  
Si encuentras inconsistencias en Firefox, se recomienda combinar con la página de depuración nativa del navegador (`about:debugging`) para confirmación cruzada.

## Notas

- Solo tiene efecto en modo de desarrollo (`addfox dev`)
- La construcción de producción eliminará la inyección de monitoreo
- Los datos de error son visibles localmente por defecto, no se suben automáticamente

## Configuraciones relacionadas

- [`debug`](/es/config/debug) - Configuración de monitoreo de errores
