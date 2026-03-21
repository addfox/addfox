# addfox-with-tailwindcss

React + **Tailwind CSS v4** browser extension example: popup, options, content script, and background.

## Stack

- [addfox](https://github.com/addfox/addfox) – build and dev server
- React 18
- **Tailwind CSS v4** (`tailwindcss` + `@tailwindcss/postcss`)
- PostCSS

## Setup

From repo root:

```bash
pnpm install
cd examples/addfox-with-tailwindcss
pnpm dev
```

Load the `dist-chromium` (or `dist-firefox`) folder in your browser as an unpacked extension.

## Scripts

- `pnpm dev` – start dev server and launch Chrome
- `pnpm build` – production build

## Tailwind v4

- Styles use `@import "tailwindcss"` in `app/index.css` (popup/options) and `app/content/index.css` (content script).
- PostCSS is configured via `postcss.config.mjs` with `@tailwindcss/postcss`.
- No `tailwind.config.js` required; content detection is automatic.
