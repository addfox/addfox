# Content UI Example

Demonstrates **content UI** from `@addfox/utils`: `defineContentUI` and `mountContentUI` to inject a root element into the page (with optional shadow DOM or iframe wrapper).

This example also includes a **popup page** to interact with the content UI.

## Run

```bash
pnpm install
pnpm dev
```

Load the extension (e.g. Chrome: `dist` or `.addfox/dist`), then open any webpage. A small panel appears at the bottom-right, mounted via Shadow DOM.

Click the extension icon to open the popup and interact with the content UI.

## Usage

### Content UI

```ts
import { defineContentUI, mountContentUI } from "@addfox/utils";

const spec = defineContentUI({
  tag: "div",
  target: "body",
  attr: { id: "my-root", style: "..." },
  injectMode: "append",
  wrapper: "shadow", // "none" | "shadow" | "iframe"
});
const root = mountContentUI(spec);
root.appendChild(myElement);
```

### Popup Page

The popup is located at `app/popup/` and communicates with the content script:

```ts
// popup/index.ts - Send message to content script
await chrome.tabs.sendMessage(tab.id, {
  from: "popup",
  action: "toggleUI",
});
```

```ts
// content/index.ts - Handle message from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.from === "popup" && message.action === "toggleUI") {
    toggleUI();
    sendResponse({ success: true });
  }
});
```

See `app/content/index.ts` and `app/popup/index.ts` for the full examples.
