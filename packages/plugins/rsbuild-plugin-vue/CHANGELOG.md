# @addfox/rsbuild-plugin-vue

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

## 0.1.1-beta.12

### Patch Changes

- chore: update lib

## 0.1.1-beta.11

### Patch Changes

- chore: update libs version

## 0.1.1-beta.10

### Patch Changes

- fix: export the monitor file
- fix: fixed package.json files

## 0.1.1-beta.9

### Patch Changes

- chore: update manifest function

## 0.1.1-beta.8

### Patch Changes

- feat: add agents.md for templates

## 0.1.1-beta.7

### Patch Changes

- update templates addfox version

## 0.1.1-beta.6

### Patch Changes

- update templates addfox version

## 0.1.1-beta.5

### Patch Changes

- chore: update templates

## 0.1.1-beta.4

### Patch Changes

- 21ee3c2: fixed hmr errors

## 0.1.1-beta.3

### Patch Changes

- update packages info

## 0.1.1-beta.2

### Patch Changes

- update core packages

## 0.1.1-beta.1

### Patch Changes

- Initial release of core and CLI packages

## 0.1.1-beta.0

### Patch Changes

- Initial release of core and CLI packages

## 0.1.0

### Patch Changes

- fix some errors
