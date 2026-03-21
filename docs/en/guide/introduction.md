# Introduction

**Addfox** is a browser extension development framework built on [Rsbuild](https://rsbuild.dev), helping you develop and build Chrome and Firefox extensions in a single project.

![Addfox Architecture](/addfox-architecture.png)

## Why Addfox

Developing browser extensions should be simple—just HTML, JavaScript, and CSS. But in reality, issues like hot reload, error debugging, and frontend framework integration have plagued developers.

Addfox's goal is to make extension development simple again:

In the AI era, Addfox goes further to help AI better understand and assist with your extension development:

- **AI-friendly project structure** — Automatically generates structured documents like `llms.txt` and `meta.md`, enabling AI assistants to quickly understand project architecture and configuration
- **Terminal error output** — Errors are output directly to the terminal during development, no need to open browser DevTools, making it easy to use Ask AI features in any editor
- **Skills support** — Built-in reusable AI skill library (e.g., migrate-to-addfox, addfox-debugging) enables AI assistants to assist development and debugging more professionally
- **Minimal code constraints** — No enforced code organization patterns, allowing AI-generated code to integrate seamlessly into your project

Whether you're a developer or using AI-assisted development, Addfox provides a better experience.

## Features

### For Developers

Hot reload, multi-browser support, and minimal config so you can ship extensions faster.

| Feature | Description |
|---------|-------------|
| **Fast HMR** | Dedicated plugin for extension reload; content_script and background both hot-update |
| **Full browser support** | Support for mainstream Chromium-based browsers and Firefox; auto-detect install path and launch |
| **Framework agnostic** | Vanilla, Vue, React, Preact, Svelte, Solid—use what you like |
| **Content UI** | Built-in createContentUI for Iframe, ShadowDom, or inline content |
| **Rstack ecosystem** | Built-in support for Rsdoctor and Rstest for bundle analysis and testing |
| **Zip on build** | Running build automatically produces a zip of the extension |

### For AI

Structured meta, terminal errors, and skills—so agents can understand and extend your extension.

| Feature | Description |
|---------|-------------|
| **llms.txt and markdown metadata** | Provides clear plugin information, error details, and prompts to help AI agents develop |
| **AI-friendly error monitor** | With `--debug`, terminal error output; capture all errors without opening DevTools, ready for Ask AI in any editor |
| **Skills support** | Extensible skills for agents and automation |

## Core Concepts

Addfox encapsulates common pain points in extension development:

- **Entry auto-discovery** — Place files by convention, no need to manually configure entry
- **Smart manifest handling** — Auto-inject built paths
- **Dev auto-reload** — WebSocket listens for build completion, auto-refreshes extension

## Compared to Other Solutions

The extension development ecosystem has been greatly enriched by excellent frameworks. **WXT** brings the power of Vite with a well-designed plugin system and intuitive conventions. **Plasmo** offers comprehensive cloud integration and a polished, batteries-included developer experience. **Extension.js** provides remarkable simplicity for quick prototypes. Each has made significant contributions to making extension development more accessible.

Addfox stands on the shoulders of these giants while carving its own path:

| Solution | Build Tool | Dev Experience | Flexibility |
|----------|------------|----------------|-------------|
| Hand-written Webpack/Vite | Self-configured | Manual HMR handling | Fully controllable |
| Plasmo | Parcel | Out-of-the-box | Convention-based with cloud features |
| WXT | Vite | Out-of-the-box | Convention-based with plugin ecosystem |
| **Addfox** | **Rsbuild** | **Out-of-the-box** | **Minimal conventions + AI-native** |

**Addfox's unique advantages:**

- **Rsbuild-powered speed** — Faster cold starts and HMR compared to Vite/Parcel-based solutions
- **AI-first design** — Built-in `llms.txt`, structured error output, and Skills support for AI-assisted development
- **Maximum freedom** — No enforced file structures or custom APIs; use your preferred patterns
- **Framework-agnostic core** — Works with any UI framework without wrapper components or special adapters

## Quick Start

```bash
# Create project with scaffold
pnpm create addfox-app

# Enter project directory
cd my-extension

# Start dev server
pnpm dev
```

Edit `app/popup/index.tsx`, and the extension will auto-reload on save.

## Next Steps

- [Installation](/guide/install) — Detailed project creation steps
- [App Directory](/guide/app-dir) — Learn about project organization
- [Config Reference](/config/manifest) — View all configuration options
