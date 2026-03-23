# report

`report` se utiliza para habilitar el análisis de informes de construcción de Rsdoctor.

## Resumen

- **Tipo**: `boolean | RsdoctorReportOptions`
- **Valor por defecto**: `false`
- **Requerido**: No

## Uso

```ts
// addfox.config.ts
import { defineConfig } from "addfox";

export default defineConfig({
  report: true,  // Habilitar informe de Rsdoctor
});
```

## Formas de configuración

### Valor booleano

```ts
export default defineConfig({
  report: true,   // Habilitar informe
  // report: false, // Deshabilitar informe (predeterminado)
});
```

### Forma de objeto

Pasa opciones de configuración de Rsdoctor:

```ts
export default defineConfig({
  report: {
    mode: "normal",
    port: 9988,
    disableClientServer: false,
  },
});
```

## Opciones de Rsdoctor

| Opción | Tipo | Descripción |
|------|------|------|
| `mode` | `"brief" \| "normal" \| "lite"` | Modo de informe |
| `port` | `number` | Puerto del servidor de informes |
| `disableClientServer` | `boolean` | Si deshabilitar el servidor cliente |
| `output` | `object` | Configuración de salida |

Más opciones consulta la [documentación de Rsdoctor](https://rsdoctor.rs/config/options/options).

## Habilitar desde CLI

```bash
# Habilitar informe
addfox dev -r
addfox build -r

# O usar --report
addfox dev --report
```

Los parámetros de CLI sobrescriben el valor de `report` en la configuración.

## Contenido del informe

Después de habilitarlo, la construcción completada abrirá automáticamente la página de análisis de informes, que incluye:

- Análisis de tiempo de construcción
- Relaciones de dependencia de módulos
- Análisis de tamaño de paquete
- Detección de dependencias duplicadas
- Advertencias y errores de compilación

## Notas

- La función de informe aumenta el tiempo de construcción
- Se recomienda habilitarla al investigar problemas de construcción
- También se puede usar en construcción de producción

## Enlaces relacionados

- [Documentación oficial de Rsdoctor](https://rsdoctor.rs/)
