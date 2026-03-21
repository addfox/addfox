# Error Monitor

Addfox can inject runtime error monitoring in development. It aggregates multi-entry extension errors into terminal output and monitor UI for faster debugging.

## What you get

- Automatic capture for `background`, `content`, `popup`, `options`, `sidepanel` and other entries
- Structured terminal error blocks (entry, message, location, stack), optimized for AI-assisted troubleshooting
- Monitor page at `/_addfox-monitor/` for visual inspection

## Enable

Use in `addfox dev`:

```ts
// addfox.config.ts
export default defineConfig({
  debug: true,
});
```

Or enable temporarily from CLI:

```bash
addfox dev --debug
```

## AI-friendly terminal output

With monitor enabled, Addfox prints structured error context into terminal output.  
You can paste the block directly to AI tools with minimal extra explanation.

Typical fields:

- entry
- message
- location
- stack

## Firefox note

Firefox extension runtime/debug mechanics differ from Chromium (especially background lifecycle and debugging channels), so monitor behavior may not be identical across browsers.

If behavior differs in Firefox, validate together with native Firefox debugging tools (`about:debugging`).

## Notes

- Dev-only (`addfox dev`)
- Removed from production build
- Error data is local by default

## Related

- [`debug`](/config/debug) - monitor switch
