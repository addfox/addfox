# Vue Extension Template

Minimal browser extension template with Vue 3: **popup**, **options**, **content script**, **background** and simple messaging.

**Dependencies**: With `@addfox/rsbuild-plugin-vue` you only need to add **vue** (runtime) in your app. You do **not** need to manually install `@rsbuild/plugin-vue`, `@rsbuild/plugin-vue-jsx`, `@rsbuild/plugin-babel`, `@vue/babel-plugin-jsx`, or `@vue/compiler-sfc` — the plugin brings them in.

## Structure

- `src/background/index.ts` – service worker, handles `PING` and `RELAY_TO_CONTENT`
- `src/popup/` – popup UI (Vue), sends messages to background and to content
- `src/options/` – options page (Vue), storage + ping background
- `src/content/index.ts` – content script, shows a badge and receives messages from popup/background

## Messaging

- **Popup → Background**: `chrome.runtime.sendMessage({ type: "PING" })` → background replies `{ from: "background" }`
- **Popup → Content**: `chrome.runtime.sendMessage({ type: "RELAY_TO_CONTENT", payload })` → background forwards to active tab content script
- **Content** listens for `FROM_BACKGROUND` and updates the on-page badge

## Run

```bash
pnpm install   # from addfox root
cd examples/vue-template
pnpm run dev   # or pnpm run build
```

Load `dist` as an unpacked extension in Chrome (or use addfox dev to open automatically).
