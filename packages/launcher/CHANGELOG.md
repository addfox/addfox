# @addfox/launcher

## 0.2.5

### Patch Changes

- feat: HTML entry discovery, HTML page HMR reload, and dev experience improvements

  - Add HTML entry parsing and discovery in `@addfox/core` (support `data-addfox-entry` script tags and HTML-first entries)
  - Reload extension HTML pages on template changes during dev (`@addfox/rsbuild-plugin-extension-entry`)
  - Improve HMR scope handling, browser cleanup on dev shutdown, and Chromium launcher reliability
  - Add `--port` CLI flag for Rsbuild dev server; log extension size after first dev compile
  - Gracefully shut down dev server, browser, and HMR sockets on SIGINT/SIGTERM
  - Upgrade Rsbuild/Rspack catalog to 2.1.1 and refresh create-addfox-app templates

## 0.2.4

### Patch Changes

- fix: recover sourcemap of content/background

## 0.2.3

### Patch Changes

- chore: resolve latest addfox versions from npm registry to avoid pnpm lowest-direct resolution

## 0.2.2

### Patch Changes

- feat: add create arg

## 0.2.1

### Patch Changes

- fix: watchOptions.ignored .addfox dir

## 0.2.0

### Minor Changes

- refactor: update browser launcher
