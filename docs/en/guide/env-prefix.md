# Environment Variables

Addfox supports environment variables via `.env` files that can be safely used in client-side code.

## Basic Usage

Create a `.env` file in the project root:

```bash
# .env
ADDFOX_PUBLIC_API_URL=https://api.example.com
ADDFOX_PUBLIC_APP_NAME=My Extension
ADDFOX_PRIVATE_API_KEY=secret_key_here
```

## Default Prefix

Addfox only exposes environment variables starting with `ADDFOX_PUBLIC_` by default:

```ts
// app/popup/index.tsx
console.log(process.env.ADDFOX_PUBLIC_API_URL);   // ✅ "https://api.example.com"
console.log(process.env.ADDFOX_PUBLIC_APP_NAME);  // ✅ "My Extension"
console.log(process.env.ADDFOX_PRIVATE_API_KEY);  // ❌ undefined
console.log(process.env.PRIVATE_API_KEY);         // ❌ undefined
```

## Scope

Environment variables are injected into all **client code** entries:

- **background** — Service Worker / Background script
- **content** — Content Script
- **popup** — Popup page
- **options** — Options page
- **sidepanel** — Side panel
- **devtools** — Developer tools

:::tip Server vs Client
- `process.env.*` in `manifest` config is resolved at **build time** (server-side)
- `process.env.*` in entry code is available at **runtime** (client-side)

:::

## Built-in Variables

Addfox automatically injects the following built-in variables (no need to define in `.env`):

| Variable | Description | Example |
|----------|-------------|---------|
| `process.env.BROWSER` | Current build target | `chrome`, `firefox` |
| `process.env.NODE_ENV` | Current environment | `development`, `production` |
| `process.env.ADDFOX_VERSION` | Addfox version | `1.0.0` |

## Different Environments

### Development

Create `.env.development`:

```bash
# .env.development
ADDFOX_PUBLIC_API_URL=http://localhost:3000
ADDFOX_PUBLIC_DEBUG=true
```

### Production

Create `.env.production`:

```bash
# .env.production
ADDFOX_PUBLIC_API_URL=https://api.example.com
ADDFOX_PUBLIC_DEBUG=false
```

### Environment File Priority

1. `.env.{mode}.local` — Local specific mode (highest priority, not committed to Git)
2. `.env.{mode}` — Specific mode
3. `.env.local` — Local environment (not committed to Git)
4. `.env` — Default (lowest priority)

## Complete Example

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

## Notes

- Environment variable values are always strings
- Booleans need manual conversion: `process.env.ADDFOX_PUBLIC_DEBUG === "true"`
- Restart dev server after modifying `.env` files
- Don't use non-`ADDFOX_PUBLIC_` prefixed variables in client code, they will be `undefined`
