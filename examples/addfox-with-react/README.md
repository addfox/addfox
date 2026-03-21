# React Extension Template

Minimal browser extension template with React: **popup**, **options**, **content script**, **background** and simple messaging.

**Dependencies**: Add **react**, **react-dom** and **@rsbuild/plugin-react** to your project; use `plugins: [pluginReact()]` in `addfox.config.ts` (import from `@rsbuild/plugin-react`).

## Structure

- `src/background/index.ts` – service worker, handles `PING` and `RELAY_TO_CONTENT`
- `src/popup/` – popup UI (React), sends messages to background and to content
- `src/options/` – options page (React), storage + ping background
- `src/content/index.ts` – content script, shows a badge and receives messages from popup/background

## Messaging

- **Popup → Background**: `chrome.runtime.sendMessage({ type: "PING" })` → background replies `{ from: "background" }`
- **Popup → Content**: `chrome.runtime.sendMessage({ type: "RELAY_TO_CONTENT", payload })` → background forwards to active tab content script
- **Content** listens for `FROM_BACKGROUND` and updates the on-page badge

## Run

```bash
pnpm install   # from addfox root
cd examples/react-template
pnpm run dev   # or pnpm run build
```

Load `dist` as an unpacked extension in Chrome (or use addfox dev to open automatically).
