# Variables de entorno

Addfox soporta el manejo de variables de entorno a través de archivos `.env`, que se pueden usar de forma segura en el código del cliente.

## Uso básico

Crea un archivo `.env` en la raíz del proyecto:

```bash
# .env
ADDFOX_PUBLIC_API_URL=https://api.example.com
ADDFOX_PUBLIC_APP_NAME=My Extension
ADDFOX_PRIVATE_API_KEY=secret_key_here
```

## Prefijo predeterminado

Addfox por defecto solo expone variables de entorno que comiencen con `ADDFOX_PUBLIC_`:

```ts
// app/popup/index.tsx
console.log(process.env.ADDFOX_PUBLIC_API_URL);   // ✅ "https://api.example.com"
console.log(process.env.ADDFOX_PUBLIC_APP_NAME);  // ✅ "My Extension"
console.log(process.env.ADDFOX_PRIVATE_API_KEY);  // ❌ undefined
console.log(process.env.PRIVATE_API_KEY);         // ❌ undefined
```

## Alcance de aplicación

Las variables de entorno se inyectan en todas las entradas de **código del cliente**:

- **background** — Service Worker / Background script
- **content** — Content Script
- **popup** — Página emergente
- **options** — Página de opciones
- **sidepanel** — Panel lateral
- **devtools** — Herramientas de desarrollador

:::tip Diferencia entre servidor y cliente
- `process.env.*` en la configuración `manifest` se resuelve en **tiempo de construcción** (servidor)
- `process.env.*` en el código de entrada está disponible en **tiempo de ejecución** (cliente)

:::

## Variables integradas

Addfox inyecta automáticamente las siguientes variables integradas, sin necesidad de definirlas en `.env`:

| Nombre de variable | Descripción | Valor de ejemplo |
|--------|------|--------|
| `process.env.BROWSER` | Navegador de construcción actual | `chrome`, `firefox` |
| `process.env.NODE_ENV` | Entorno actual | `development`, `production` |
| `process.env.ADDFOX_VERSION` | Versión de Addfox | `1.0.0` |

## Diferentes entornos

### Entorno de desarrollo

Crea `.env.development`:

```bash
# .env.development
ADDFOX_PUBLIC_API_URL=http://localhost:3000
ADDFOX_PUBLIC_DEBUG=true
```

### Entorno de producción

Crea `.env.production`:

```bash
# .env.production
ADDFOX_PUBLIC_API_URL=https://api.example.com
ADDFOX_PUBLIC_DEBUG=false
```

### Prioridad de archivos de entorno

1. `.env.{mode}.local` — Local modo específico (máxima prioridad, no enviar a Git)
2. `.env.{mode}` — Modo específico
3. `.env.local` — Entorno local (no enviar a Git)
4. `.env` — Predeterminado (mínima prioridad)

## Ejemplo completo

```bash
# .env
ADDFOX_PUBLIC_API_URL=https://api.example.com
ADDFOX_PUBLIC_FEATURE_FLAG=true
ADDFOX_PRIVATE_DATABASE_URL=secret
```

```ts
// addfox.config.ts
export default defineConfig({
  manifest: {
    name: process.env.ADDFOX_PUBLIC_APP_NAME || "My Extension",
  },
});
```

```ts
// app/popup/index.tsx
const apiUrl = process.env.ADDFOX_PUBLIC_API_URL;
const showFeature = process.env.ADDFOX_PUBLIC_FEATURE_FLAG === "true";
```

## Notas

- Los valores de variables de entorno son cadenas
- Los valores booleanos necesitan conversión manual: `process.env.ADDFOX_PUBLIC_DEBUG === "true"`
- Después de modificar el archivo `.env`, necesitas reiniciar el servidor de desarrollo
- No uses variables sin prefijo `ADDFOX_PUBLIC_` en el código del cliente, serán `undefined`
