# Content UI (React + Tailwind) Example

Content script UI using **@addfox/utils** (`defineContentUI` / `mountContentUI`) with **React** and **Tailwind CSS**.

## Run

```bash
pnpm install
pnpm dev
```

Load the extension and open any webpage. A small React panel appears at the bottom-right with Tailwind styles.

## Stack

- **defineContentUI** + **mountContentUI**: inject root into the page (`wrapper: "none"` so Tailwind applies).
- **React 18**: `createRoot(mountContentUI(spec)).render(<App />)`.
- **Tailwind CSS**: `app/content/index.css` with `@tailwind`; content entry imports it.

See `app/content/index.tsx` for the full content script.

**Note:** The build outputs `static/css/content.[hash].css`. If your manifest does not include it in `content_scripts[].css`, add it so Tailwind styles load (e.g. `"css": ["static/css/content.108c18a2.css"]` — use the actual built filename).
