---
title: create-addfox-app
---

# create-addfox-app

Interactive scaffolder that generates a new Addfox-based browser extension project from a few prompts.

## Usage

Use it as an `addfox` subcommand:

```bash
addfox create [project-name]
# or
npx addfox@latest create [project-name]
```

Or use the legacy package name:

```bash
npx create-addfox-app [project-name]
# or
pnpm create addfox-app [project-name]
```

## Flow

1. Select a framework: `vanilla`, `vue`, `react`, `preact`, `svelte`, or `solid`
2. Choose language: **TypeScript** or **JavaScript**
3. Choose package manager: `pnpm`, `npm`, `yarn`, or `bun`
4. Select entries to include (multi-select)
5. Decide whether to install Addfox skills

The project is written to the current directory or to the directory you specify.

## Output

The generated project includes:

- `addfox.config.ts` (or `.js`) with minimal manifest and entry discovery
- A scaffold matching your selected framework and entries
- No hard-coded entry paths in the manifest by default

## Templates

Templates ship inside the package under `templates/` (e.g. `template-vanilla-ts`, `template-react-ts`). The chosen folder is copied into your new project without remote downloads. The template's `addfox.config` is preserved; the CLI only merges Rsbuild Less/Sass plugins when those style engines are selected.
