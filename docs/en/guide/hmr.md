# Hot Reload (HMR)

The `addfox dev` command provides a hot reload experience during development: after saving code, the project is automatically rebuilt and the browser extension is reloaded via WebSocket.

## How It Works

```
Source code changes
    ↓
Rsbuild Watch rebuilds
    ↓
Build complete → WebSocket notification
    ↓
Browser extension reloads
    ↓
Pages auto-refresh
```

## Hot Reload Mechanisms by Entry

### Background / Service Worker

Background scripts use **extension reload** mechanism:

1. Code changes → Rsbuild rebuilds
2. Build complete → WebSocket sends reload command
3. Calls `chrome.runtime.reload()` to reload entire extension
4. Service Worker restarts with new code

:::warning State Loss
Service Worker loses in-memory state after reload. Use `chrome.storage` API for persistent data.
:::

### Content Script

Content Scripts use **re-injection** mechanism:

1. Code changes → Rsbuild rebuilds
2. Build complete → Extension reloads
3. Content Script auto-injects into matched pages
4. Open tabs can auto-refresh (see configuration)

```ts
// addfox.config.ts
export default defineConfig({
  hotReload: {
    autoRefreshContentPage: true,  // Auto-refresh page on content changes, default: true
  },
});
```

:::tip Difference from Background
Content Scripts run in the web page environment. After reload, they re-inject into matched pages without needing to manually refresh the extensions management page.
:::

### Popup / Options / Sidepanel

Page entries use **Rsbuild HMR** mechanism:

1. Code changes → Rsbuild attempts HMR hot replacement
2. If HMR succeeds → Page updates locally, state preserved
3. If HMR fails → Automatically falls back to page refresh

:::tip HMR Advantages
- Faster update speed
- Preserves component state (e.g., form inputs)
- Smoother development experience

:::

:::warning HTML template limitation
Due to Rsbuild's mechanism, HTML template files (such as `popup/index.html`) do not support true HMR hot replacement.  
After changing HTML templates, Addfox will fall back to page refresh / extension reload behavior.
:::

## Firefox Special Handling

Firefox dev mode uses the **web-ext** tool to manage extensions:

- Extension reload is handled by `web-ext`, not Addfox's WebSocket
- Firefox automatically opens and loads the extension on first start
- Supports auto-reload (livereload)

:::info
When developing with Firefox, ensure Firefox browser is installed. Addfox automatically calls `web-ext` to handle Firefox extension loading and reloading.
:::

## Usage

```bash
# Start dev server (HMR enabled by default)
addfox dev

# Specify target browser
addfox dev -b chrome
addfox dev -b firefox
```

## First Start Flow

After running `addfox dev`:

1. First build completes
2. Browser auto-starts based on configuration
3. Development extension is loaded
4. Extension popup/options pages auto-open (if `open` is configured)

## Configuration

### Hot Reload Port

```ts
// addfox.config.ts
export default defineConfig({
  hotReload: {
    port: 23333,              // WebSocket port, default: 23333
    autoRefreshContentPage: true,  // Auto-refresh page on content changes, default: true
  },
});
```

## Next Steps

- [browserPath config](/guide/launch) — Configure auto browser launch during dev
- [monitor debugging](/guide/monitor) — Use error monitoring panel
- [config/hot-reload](/config/hot-reload) — Complete hot reload configuration
