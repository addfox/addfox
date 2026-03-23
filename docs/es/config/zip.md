# zip

`zip` se utiliza para controlar si el directorio de salida se empaqueta como archivo zip después de la construcción.

## Resumen

- **Tipo**: `boolean`
- **Valor por defecto**: `true`
- **Requerido**: No

## Uso

```ts
// addfox.config.ts
import { defineConfig } from "addfox";

export default defineConfig({
  zip: true,   // Empaquetar después de la construcción
  // zip: false, // No empaquetar
});
```

## Ubicación de salida

Ruta de salida del archivo empaquetado:

```
{outputRoot}/{outDir}.zip
```

Predeterminado: `.addfox/extension.zip`

## Ejemplos

### Deshabilitar empaquetado

```ts
export default defineConfig({
  zip: false,
});
```

### Habilitar empaquetado (predeterminado)

```ts
export default defineConfig({
  zip: true,
});
```

O no configurar (usar valor predeterminado).

## Contenido del paquete

El archivo zip contiene todo el contenido de salida de la construcción:

- `manifest.json`
- Todos los scripts y páginas de entrada
- Recursos estáticos del directorio `public/`

## Usos

El archivo zip empaquetado se puede usar para:
- Enviar a Chrome Web Store
- Enviar a Firefox Add-ons
- Distribución y respaldo

## Configuraciones relacionadas

- [`outDir`](/config/out-dir) - Configuración del directorio de salida
- [guide/zip](/guide/zip) - Guía de empaquetado
