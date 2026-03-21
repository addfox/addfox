# Environment Variables

Addfox uses Rsbuild's `loadEnv` to load `.env` files from the project root, and by default only exposes variables starting with `ADDFOX_PUBLIC_` to client code.

## Default Behavior

- **Default Prefix**: `ADDFOX_PUBLIC_`
- **Client Code**: background, content, popup, options, sidepanel, devtools entries
- **Loaded Files**: `.env`, `.env.local`, `.env.{mode}`, `.env.{mode}.local`

## Scope

Environment variables are injected into all **client code** entries, but **not** in the `manifest` configuration in `addfox.config.ts` (which uses build-time environment).

## Built-in Variables

Addfox automatically injects these variables:

| Variable | Description |
|----------|-------------|
| `process.env.BROWSER` | Current build target browser |
| `process.env.NODE_ENV` | Current environment mode |
| `process.env.ADDFOX_VERSION` | Addfox version |

## Usage Example

### .env File

```bash
ADDFOX_PUBLIC_API_URL=https://api.example.com
ADDFOX_PUBLIC_APP_NAME=My Extension
ADDFOX_PRIVATE_KEY=secret  # Won't be exposed to client
```

### Using in Code

```ts
// app/popup/index.tsx
const apiUrl = process.env.ADDFOX_PUBLIC_API_URL;
```

## Security Recommendations

- Always use `ADDFOX_PUBLIC_` prefix to mark variables safe for client exposure
- Sensitive info (like API keys) should not start with `ADDFOX_PUBLIC_`
- `.env.local` and `.env.{mode}.local` files should not be committed to Git

## Related Documentation

- [guide/env-prefix](/guide/env-prefix) - Environment variables usage guide
