# Content UI Example

Demonstrates **content UI** from `@addfox/utils`: `defineContentUI` and `mountContentUI` to inject a root element into the page (with optional shadow DOM or iframe wrapper).

## Run

```bash
pnpm install
pnpm dev
```

Load the extension (e.g. Chrome: `dist` or `.addfox/dist`), then open any webpage. A small panel appears at the bottom-right, mounted via Shadow DOM.

## Usage

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

See `app/content/index.ts` for the full example.
