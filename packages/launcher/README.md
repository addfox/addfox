# @addfox/launcher

Browser launcher for extension development — supports Chromium family (Chrome, Edge, Brave, etc.) and Gecko family (Firefox, Zen, LibreWolf, etc.).

## Installation

```bash
npm install @addfox/launcher
```

## CLI Usage

```bash
npx addfox-launcher <browser> [url] [options]
```

### Browsers

- **Chromium**: `chrome`, `chromium`, `edge`, `brave`, `vivaldi`, `opera`, `santa`, `arc`, `yandex`, `browseros`, `custom`
- **Gecko**: `firefox`, `zen`, `librewolf`, `waterfox`, `floorp`

### Options

| Option | Description |
|--------|-------------|
| `--binary <path>` | Path to browser binary |
| `--extension <path>` | Extension directory to load (repeatable) |
| `--profile <path>` | User profile / data directory |
| `--watch <path>` | Watch directory for changes and restart (repeatable) |
| `--devtools` | Open DevTools automatically |
| `--remote-debugging-port <port>` | Enable remote debugging |
| `--args "<flags>"` | Extra browser arguments |
| `--verbose, -v` | Verbose logging |
| `--help, -h` | Show help |

### Examples

```bash
# Launch Chrome with an extension
npx addfox-launcher chrome --extension ./dist

# Launch Firefox with extension and file watching
npx addfox-launcher firefox --extension ./dist --watch ./src --verbose
```

## Programmatic API

```ts
import { launchBrowser } from "@addfox/launcher";

const browser = await launchBrowser({
  target: "chrome",
  extensionPaths: ["./dist"],
  devtools: true,
});

// Later
await browser.exit();
```

### Subpath Exports

```ts
// Chromium-specific APIs
import { launchChromium } from "@addfox/launcher/chromium";

// Gecko-specific APIs
import { launchGecko, createGeckoProfile, reinstallTemporaryAddonViaRDP } from "@addfox/launcher/gecko";
```

## License

MIT
