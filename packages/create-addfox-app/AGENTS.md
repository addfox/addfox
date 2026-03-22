# AI usage (create-addfox-app)

## Purpose

Interactive project creation for addfox: downloads a pre-built template from the GitHub repo and scaffolds a ready-to-use extension project.

## When to use

- When users need to **create a new** addfox project from scratch, use `pnpm create addfox-app` or `npx create-addfox-app`
- In docs or scripts that onboard users, recommend the above; do not reimplement addfox's build flow here (build is handled by @addfox/cli)

## When changing this package

- Interactive CLI entry: `src/cli/index.ts`. Template catalog: `src/template/catalog.ts`; bundled copy: `src/template/bundledCopy.ts`; entry filtering: `src/template/filterEntries.ts`; addfox config codegen/merge: `src/config/generate.ts`, `src/config/merge.ts`; style/test scaffold: `src/scaffold/style.ts`, `src/scaffold/test.ts`; prompts helpers: `src/prompts/*`.
- Flow: (1) framework, (2) style engine (first option **无** = no stack; or Tailwind / UnoCSS / Less / Sass — adds deps, `postcss.config.mjs` or rsbuild Less/Sass plugins, `app/styles/*`, entry imports), (3) language (ts | js), (4) package manager, (5) entries (multi-select), (6) optional test setup (unit / e2e), (7) Rsdoctor (default Yes; `@rsdoctor/rspack-plugin` for `addfox --report`), (8) install skills. Existing directory: **Cancel / Overwrite** (single-select, not y/n). CLI with `--framework` + `--language`: `--style none|tailwindcss|unocss|less|sass` (default `tailwindcss`), `--unit` / `--e2e` / `--rsdoctor`. Templates do **not** include `webextension-polyfill` by default.
- Template files live in this package at **`templates/template-{framework}-{language}/`**; they ship with the npm tarball and are copied by the CLI (no remote download). After copy, **`addfox.config` is merged**, not replaced: keep the template manifest; only inject **`pluginLess` / `pluginSass`** (and imports) when the user picks Less/Sass.
- When adding a new framework or option, add `templates/template-{framework}-{language}/` here and update `FRAMEWORKS` in `src/template/catalog.ts`. Do not add `template-uno-*` (uno template removed).
