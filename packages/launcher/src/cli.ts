#!/usr/bin/env node
import { launchBrowser } from "./launcher";
import { watchFiles } from "./shared/watcher";
import type { BrowserTarget } from "./types";

function parseArgs(argv: string[]): Record<string, string | boolean | string[]> {
  const args: Record<string, string | boolean | string[]> = {};
  const list: string[] = [];

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (next != null && !next.startsWith("-")) {
        if (key === "extension" || key === "ext" || key === "watch") {
          const existing = args[key];
          if (existing) {
            const arr = Array.isArray(existing) ? existing : [existing as string];
            args[key] = [...arr, next];
          } else {
            args[key] = [next];
          }
        } else {
          args[key] = next;
        }
        i++;
      } else {
        args[key] = true;
      }
    } else if (arg.startsWith("-")) {
      const key = arg.slice(1);
      const next = argv[i + 1];
      if (next != null && !next.startsWith("-")) {
        args[key] = next;
        i++;
      } else {
        args[key] = true;
      }
    } else {
      list.push(arg);
    }
  }

  if (list.length > 0 && !args.target) {
    args.target = list[0];
  }
  if (list.length > 1 && !args.url) {
    args.url = list[1];
  }

  return args;
}

function printHelp(): void {
  console.log(`
addfox-launcher — Launch a browser with extensions loaded for development

Usage:
  addfox-launcher <browser> [url] [options]

Browsers:
  chrome, chromium, edge, brave, vivaldi, opera, santa, arc, yandex, browseros
  firefox, zen, librewolf, waterfox, floorp

Options:
  --binary <path>         Path to browser binary
  --extension <path>      Extension directory to load (repeatable)
  --profile <path>        User profile / data directory
  --watch <path>          Watch directory for changes and restart (repeatable)
  --devtools              Open DevTools automatically
  --remote-debugging-port <port>  Enable remote debugging
  --args "<flags>"        Extra browser arguments (space-separated)
  --verbose, -v           Verbose logging
  --help, -h              Show this help

Examples:
  addfox-launcher chrome --extension ./dist
  addfox-launcher firefox --extension ./dist --watch ./src --verbose
`);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (args.help || args.h) {
    printHelp();
    process.exit(0);
  }

  const target = (args.target as string) ?? "chrome";
  const validTargets: BrowserTarget[] = [
    "chrome", "chromium", "edge", "brave", "vivaldi", "opera", "santa", "arc", "yandex", "browseros", "custom",
    "firefox", "zen", "librewolf", "waterfox", "floorp",
  ];

  if (!validTargets.includes(target as BrowserTarget)) {
    console.error(`Unknown browser: ${target}`);
    console.error(`Valid targets: ${validTargets.join(", ")}`);
    process.exit(1);
  }

  const extensionPaths = Array.isArray(args.extension)
    ? args.extension
    : args.extension
      ? [args.extension as string]
      : Array.isArray(args.ext)
        ? args.ext
        : args.ext
          ? [args.ext as string]
          : [];

  const watchPaths = Array.isArray(args.watch)
    ? args.watch
    : args.watch
      ? [args.watch as string]
      : [];

  const extraArgs = args.args ? (args.args as string).split(" ") : [];

  const browser = await launchBrowser({
    target: target as BrowserTarget,
    binaryPath: (args.binary as string) || undefined,
    extensionPaths,
    userDataDir: (args.profile as string) || undefined,
    startUrl: (args.url as string) || undefined,
    devtools: !!(args.devtools || args.devtools === ""),
    remoteDebuggingPort: args["remote-debugging-port"] ? Number(args["remote-debugging-port"]) : undefined,
    args: extraArgs,
    verbose: !!(args.verbose || args.v),
  });

  let watcher: ReturnType<typeof watchFiles> | undefined;

  if (watchPaths.length > 0) {
    watcher = watchFiles({
      paths: watchPaths,
      onChange: (path, event) => {
        console.log(`\x1b[35m[Watcher]\x1b[0m ${event}: ${path}`);
        console.log("\x1b[36m[Launcher]\x1b[0m Change detected, restarting browser...");
        watcher?.close();
        browser.exit().then(() => {
          main().catch((e) => {
            console.error(e);
            process.exit(1);
          });
        });
      },
      verbose: !!(args.verbose || args.v),
    });
  }

  process.on("SIGINT", async () => {
    watcher?.close();
    await browser.exit();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    watcher?.close();
    await browser.exit();
    process.exit(0);
  });

  browser.process.on("exit", () => {
    watcher?.close();
    process.exit(0);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
