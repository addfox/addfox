# Pruebas

Addfox tiene soporte de pruebas **Rstest** integrado, se recomienda ejecutar pruebas uniformemente a través de `addfox test`.

## Verificar dependencias primero

Antes de ejecutar pruebas, asegúrate de que las dependencias necesarias estén instaladas:

```bash
pnpm add -D @rstest/core
```

Si vas a ejecutar E2E del lado del navegador, agrega:

```bash
pnpm add -D @rstest/browser playwright
```

## Comando unificado

Usar preferentemente:

```bash
addfox test
```

Este comando seguirá el flujo de trabajo de pruebas de Addfox, no necesitas ensamblar manualmente comandos de bajo nivel.

## Pruebas unitarias (Unit)

Adecuado para:

- Funciones de utilidad
- Lógica de procesamiento de mensajes
- Manejo de estado y almacenamiento

Nombres comunes:

- `*.test.ts`
- `*.spec.ts`

## Pruebas E2E

Adecuado para:

- Verificación del flujo de carga de extensión
- Interacción de extremo a extremo entre popup/content/background
- Regresión de rutas de usuario clave

Se recomienda ejecutar E2E completo en CI o antes del lanzamiento.

## Ejemplo de configuración mínima

```ts
// rstest.config.ts
import { defineConfig } from "@rstest/core";

export default defineConfig({
  test: {
    include: ["**/*.test.ts", "**/*.spec.ts"],
  },
});
```

## Scripts recomendados

```json
{
  "scripts": {
    "test": "addfox test"
  }
}
```

## Enlaces de referencia

- [Documentación oficial de Rstest](https://rstest.dev/)
- [Documentación de pruebas de navegador de Rstest](https://rstest.dev/guide/browser-testing)
