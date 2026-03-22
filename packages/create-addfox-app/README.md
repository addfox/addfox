<p align="center">
  <img width="200" src="https://raw.githubusercontent.com/addfox/addfox/main/addfox.png" alt="Addfox">
</p>

# create-addfox-app

[中文](README-zh_CN.md) | English

---

Interactive scaffolder: generates a addfox-based extension project from options (template, package manager, entries, skills).

- Commands: `create-addfox-app` or `pnpm create addfox-app` (and npm/yarn/bun equivalents)
- Flow: (1) select framework (vanilla / vue / react / preact / svelte / solid), (2) language (TypeScript / JavaScript), (3) package manager (pnpm / npm / yarn / bun), (4) entries to include (multi-select), (5) whether to install addfox skills (yes/no). Output to cwd or a given directory. Generated project uses **addfox.config.ts** or **addfox.config.js** with minimal manifest (entry discovery; no built-in entry paths in manifest).

## Templates

Scaffold templates ship inside this package under **`templates/`** (e.g. `template-vanilla-ts`, `template-react-ts`). They are included in the published npm tarball; the CLI copies the chosen folder into your new project (no remote download). The template’s **`addfox.config`** (including `manifest`) is **preserved**; the CLI only **merges** Rsbuild Less/Sass plugins when those style engines are selected. If no config file exists, a full fallback config is generated.
