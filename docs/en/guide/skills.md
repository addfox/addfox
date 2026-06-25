---
name: addfox-skills
description: Installable skill library for Addfox extension development. 
---

# Skills

It provides installable skills focused on browser extension development with Addfox.

## Install

From your project root:

```bash
# Install all skills from the repo
npx skills add addfox/skills

# Install only specific skills
npx skills add addfox/skills --skill migrate-to-addfox
npx skills add addfox/skills --skill addfox-best-practices
npx skills add addfox/skills --skill extension-functions-best-practices
npx skills add addfox/skills --skill addfox-debugging
npx skills add addfox/skills --skill addfox-testing

# List available skills first
npx skills add addfox/skills --list
```

Or use the full GitHub URL:

```bash
npx skills add https://github.com/addfox/skills
```

## Available Skills

| Skill | Description |
|-------|-------------|
| **migrate-to-addfox** | Migrate existing projects to Addfox from WXT, Plasmo, Extension.js, or vanilla (no framework). |
| **addfox-best-practices** | Best practices for Addfox extension projects: entry, config, manifest, permissions, cross-browser support, framework/style choices, and messaging. |
| **extension-functions-best-practices** | Implementation guidance for extension feature domains (video/audio/image/download/AI/translation/password manager/web3, etc.), with recommended libraries and references. |
| **addfox-debugging** | Troubleshoot build/runtime issues using terminal output, `.addfox/error.md`, `.addfox/meta.md`, and structured debugging workflow. |
| **addfox-testing** | Testing guidance for Addfox projects: unit tests and E2E strategy, setup patterns, and framework-specific testing notes. |

## Repository Layout

```tree
skills/
├── migrate-to-addfox/
│   ├── SKILL.md
│   └── references/
├── addfox-best-practices/
│   ├── SKILL.md
│   ├── reference.md
│   └── rules/
├── extension-functions-best-practices/
│   ├── SKILL.md
│   └── reference.md
├── addfox-debugging/
│   ├── SKILL.md
│   └── reference.md
└── addfox-testing/
    ├── SKILL.md
    └── reference.md
```

## Notes

- Skills are distributed via `skills CLI`, then copied into your project skill directory (for example `.cursor/skills/` or `.agents/skills/`).
- You can install all skills first, then keep only what your team needs.
