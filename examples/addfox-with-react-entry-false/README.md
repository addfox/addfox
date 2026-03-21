# React example with entry: false

This example uses **addfox** with `entry: false`. The framework does not discover or inject entries; all entry points are configured manually in **rsbuild**.

## What the framework still does

- **Manifest**: resolved from config and written to the output dir (no `[addfox.xxx]` placeholders; paths are literal).
- **Hot reload**: WebSocket + auto-launch browser in dev.
- **debug / hotReload / appDir / outDir**: still read from `addfox.config.ts`.

## Entry configuration

Entries are set in `addfox.config.ts` under `rsbuild.source.entry`:

- **popup** → `./app/popup/index.tsx` (generates `popup/index.html` + `popup/index.js`)
- **options** → `./app/options/index.tsx` (generates `options/index.html` + `options/index.js`)
- **background** → `./app/background/index.ts` with `html: false` → `background/index.js`
- **content** → `./app/content/index.ts` with `html: false` → `content/index.js`

Output is written to `.addfox/extension` with nested HTML and custom JS/CSS filenames so the manifest paths match.

## Run

```bash
pnpm install   # from addfox repo root
cd examples/addfox-with-react-entry-false
pnpm run dev   # or pnpm run build
```

Load the extension from `.addfox/extension` (unpacked) or use `addfox dev` to open the browser automatically.
