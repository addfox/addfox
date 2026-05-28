# Firefox + React Extension Template

Minimal Firefox extension template with **React**: **popup**, **options**, **content script**, **background** and simple messaging.

**Dependencies**: Add **react**, **react-dom**, **webextension-polyfill** and **@rsbuild/plugin-react** to your project; use `plugins: [pluginReact()]` in `addfox.config.ts` (import from `@rsbuild/plugin-react`).

## Structure

- `app/background/index.ts` – service worker, handles `PING` and `RELAY_TO_CONTENT`
- `app/popup/` – popup UI (React), sends messages to background and to content
- `app/options/` – options page (React), storage + ping background
- `app/content/index.ts` – content script, shows a badge and receives messages from popup/background

## Manifest

This template provides separate manifests for **Chromium** and **Firefox**. The Firefox manifest includes `browser_specific_settings.gecko` with an extension ID and minimum version, which is required for Firefox MV3 add-on distribution and sideloading.

## Messaging

- **Popup → Background**: `browser.runtime.sendMessage({ type: "PING" })` → background replies `{ from: "background" }`
- **Popup → Content**: `browser.runtime.sendMessage({ type: "RELAY_TO_CONTENT", payload })` → background forwards to active tab content script
- **Content** listens for `FROM_BACKGROUND` and updates the on-page badge

## Run

```bash
pnpm install   # from addfox root
cd examples/addfox-with-firefox-react
pnpm run dev   # or pnpm run build
```

Load `dist` as an unpacked extension in Firefox (or use `addfox dev` to open automatically).
