# Firefox Extension Template

Minimal Firefox extension template with **popup**, **content script**, **background** and simple messaging.

## Structure

- `src/background/index.ts` – service worker, handles `PING` and `GET_VERSION`
- `src/popup/` – popup UI (vanilla TS), sends messages to background
- `src/content/index.ts` – content script, mounts a small badge

## Run

```bash
pnpm install   # from addfox root
cd examples/firefox-template
pnpm run dev
```

Load `dist` as an unpacked extension in Firefox (or let addfox dev open it).
