# @addfox/browser

Type-safe, promise-based browser extension API polyfill.

A lightweight alternative to `webextension-polyfill` built on top of `@types/chrome`
and designed for any browser extension project — not just addfox.

## Features

- Promise-based API for Chrome callback-style extension APIs.
- Supports native Firefox/Safari `browser` global when available.
- Fully typed using mapped types derived from `@types/chrome`.
- Wraps `chrome.events.Event` listeners so async responses work automatically.

## Usage

```ts
import browser from "@addfox/browser";

const tabs = await browser.tabs.query({ active: true, currentWindow: true });
await browser.storage.local.set({ key: "value" });
```

## API

- `browser` — default singleton.
- `getBrowser()` — retrieve the singleton manually.
- `isBrowserNative()` — detect whether a native promise-based `browser` global exists.
- `createBrowserPolyfill(chromeApi)` — create a polyfill from a `chrome` object.
