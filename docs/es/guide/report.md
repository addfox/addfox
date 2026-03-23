# Informe de análisis

Addfox proporciona capacidad de informe de análisis de construcción basado en **Rsdoctor**, usado para ubicar tamaño de paquete, estructura de dependencias y cuellos de botella de construcción.

## Escenarios aplicables

- Aumento anormal del volumen del producto de construcción
- Construcción notablemente más lenta después de cierto cambio
- Quieres analizar división de chunks de entrada, duplicación de dependencias y proporción de recursos estáticos

## Forma de habilitar

Línea de comandos:

```bash
addfox build --report
```

O habilitar en configuración:

```ts
export default defineConfig({
  report: true,
});
```

## Qué se puede ver

- División de entradas y chunks
- Distribución de volumen de dependencias y dependencias duplicadas
- Duración de construcción y tiempo por fase

## Flujo recomendado

1. Primero ejecutar un informe base;
2. Después de cambios grandes, generar informe nuevamente;
3. Comparar cambios en volumen y tiempo, luego decidir la dirección de optimización.

## Documentación relacionada

- [Configuración: report](/es/config/report)
- [Configuración: rsbuild](/es/config/rsbuild)
- [Documentación oficial de Rsdoctor](https://rsdoctor.rs/)
