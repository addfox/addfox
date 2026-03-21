# AI usage (@addfox/create-addfox-app)

## Purpose

Interactive project creation for addfox: downloads a pre-built template from the GitHub repo and scaffolds a ready-to-use extension project.

## When to use

- When users need to **create a new** addfox project from scratch, use `pnpm create addfox-app` or `npx create-addfox-app`
- In docs or scripts that onboard users, recommend the above; do not reimplement addfox's build flow here (build is handled by @addfox/cli)

## When changing this package

- Interactive CLI logic lives in `src/cli.ts`; types and constants in `src/templates.ts`; download/extraction logic in `src/download.ts`; entry filtering in `src/filterApp.ts`; config generation in `src/configGenerator.ts`.
- Flow: (1) framework, (2) style engine (first option **无** = no stack; or Tailwind / UnoCSS / Less / Sass — adds deps, `postcss.config.mjs` or rsbuild Less/Sass plugins, `app/styles/*`, entry imports), (3) language (ts | js), (4) package manager, (5) entries (multi-select), (6) optional test setup (unit / e2e), (7) Rsdoctor (default Yes; `@rsdoctor/rspack-plugin` for `addfox --report`), (8) install skills. Existing directory: **Cancel / Overwrite** (single-select, not y/n). CLI with `--framework` + `--language`: `--style none|tailwindcss|unocss|less|sass` (default `tailwindcss`), `--unit` / `--e2e` / `--rsdoctor`. Templates do **not** include `webextension-polyfill` by default.
- Actual template files live at **repo root** `templates/template-{framework}-{language}/`; the CLI downloads from the GitHub tarball, so the repo must have `templates/` at root.
- When adding a new framework or option, create a corresponding `templates/template-{framework}-{language}/` at repo root and update `FRAMEWORKS` in `src/templates.ts`. Do not add `template-uno-*` (uno template removed).
