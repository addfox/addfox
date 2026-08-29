# E2E Tests (Playwright)

End-to-end tests for addfox-built browser extensions. Playwright loads the built extension and tests popup/options, HMR, and Monitor.

## Scope

- **extension.spec.ts**: Popup/options loading and interaction
- **hmr.spec.ts**: plugin-extension-hmr WebSocket connection, hot-reload broadcast, getBrowserPath and custom browser paths
- **monitor.spec.ts**: plugin-extension-monitor monitor page is openable (requires a build with monitor)
- **mv2.spec.ts**: Manifest V2 checks. The built MV2 output is always validated (manifest shape, string CSP, referenced files exist); browser-level load/behavior tests only run when a Chromium build that still ships MV2 code is provided (see below)

## Prerequisites

- Run `pnpm install`
- Full e2e runs `packages:build`, `e2e:build`, and `e2e:build:monitor` before tests

## Commands

- **`pnpm run e2e`**: Build packages + build react-template + build extension with monitor (debug), then run all E2E tests (recommended)
- **`pnpm run e2e:ui`**: Run tests in UI mode
- **`pnpm run e2e:headed`**: Run tests with headed browser
- **`pnpm run e2e:build`**: Build only the E2E extension (`examples/react-template`, no monitor)
- **`pnpm run e2e:build:monitor`**: Start dev with `ADDFOX_DEBUG=true`, wait until manifest contains `open-addfox-monitor`, then exit; produces a dist with monitor
- **`pnpm run e2e:build:mv2`**: Build only the MV2 E2E extension (`examples/addfox-with-mv2`)

## Extension path

Default: `examples/react-template/.addfox/dist` (from `e2e:build`). Override with:

```bash
ADDFOX_E2E_EXTENSION_PATH=/path/to/unpacked/extension pnpx playwright test -c e2e
```

## MV2 extension path

Default: `examples/addfox-with-mv2/.addfox/extension/extension-chromium` (from `e2e:build:mv2`). Override with:

```bash
ADDFOX_E2E_MV2_EXTENSION_PATH=/path/to/unpacked/mv2/extension pnpx playwright test -c e2e
```

Playwright's bundled Chromium has removed the Manifest V2 runtime, so the browser-level MV2 tests are skipped unless you point to a Chromium build that still ships MV2 code (Chrome ≤ 140):

```bash
ADDFOX_E2E_MV2_CHROMIUM_PATH=/path/to/chrome pnpx playwright test -c e2e
```

## References

- [Playwright - Chrome extensions](https://playwright.dev/docs/chrome-extensions)
