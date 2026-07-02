import {
  CLI_COMMANDS,
  type BrowserTarget,
  type CliCommand,
  type LaunchTarget,
} from "@addfox/core";
import { AddfoxError, ADDFOX_ERROR_CODES } from "@addfox/common";

const BROWSER_FLAGS = ["-b", "--browser"];
const REPORT_FLAGS = ["-r", "--report"];
const PORT_FLAG = "--port";

/** Maps any browser input to its manifest target (chromium/firefox) */
const BROWSER_TO_TARGET: Record<string, BrowserTarget> = {
  chromium: "chromium",
  chrome: "chromium",
  edge: "chromium",
  brave: "chromium",
  vivaldi: "chromium",
  opera: "chromium",
  santa: "chromium",
  arc: "chromium",
  yandex: "chromium",
  browseros: "chromium",
  custom: "chromium",
  firefox: "firefox",
  zen: "firefox",
};

/** Valid launch targets (browser names that can be launched) */
const VALID_LAUNCH_TARGETS = new Set([
  "chrome", "chromium", "edge", "brave", "vivaldi", "opera",
  "santa", "arc", "yandex", "browseros", "custom", "firefox", "zen",
]);

export interface CliParseResult {
  command: CliCommand;
  /** Browser target for manifest (chromium/firefox) */
  browser?: BrowserTarget;
  /** Specific browser to launch (chrome/chromium/edge/brave/firefox/...) */
  launch?: LaunchTarget;
  /** True when -b/--browser was explicitly provided. */
  browserSpecified?: boolean;
  unknownBrowser?: string;
  cache?: boolean;
  /** When true, same as debug: true in addfox.config (e.g. enable monitor in dev). From --debug. */
  debug?: boolean;
  /** When true, enable Rsdoctor build report (RSDOCTOR=true). From -r/--report. */
  report?: boolean;
  /** When false, do not auto-open browser. From --no-open. */
  open?: boolean;
  /** Rsbuild dev server port. From --port. */
  port?: number;
}

/** CLI parser: parses command, -b/--browser; throws AddfoxError on invalid input. */
export class CliParser {
  parse(argv: string[]): CliParseResult {
    const cmdRaw = argv[0] ?? "dev";
    const command = CLI_COMMANDS.includes(cmdRaw as CliCommand) ? (cmdRaw as CliCommand) : null;
    if (command === null) {
      throw new AddfoxError({
        code: ADDFOX_ERROR_CODES.UNKNOWN_COMMAND,
        message: "Unknown command",
        details: `Command: "${cmdRaw}"`,
        hint: "Supported: addfox dev | addfox build | addfox test [-b chrome|...]; custom requires browser.custom in config",
      });
    }
    const { browser, launch, unknown: unknownBrowser, specified: browserSpecified } = this.getBrowserFromArgv(argv);
    const cache = this.getCacheFromArgv(argv);
    const debug = this.getDebugFromArgv(argv);
    const report = this.getReportFromArgv(argv);
    const open = this.getOpenFromArgv(argv);
    const port = this.getPortFromArgv(argv);
    return { command, browser, launch, browserSpecified, unknownBrowser, cache, debug, report, open, port };
  }

  private getBrowserFromArgv(argv: string[]): { browser?: BrowserTarget; launch?: LaunchTarget; unknown?: string; specified: boolean } {
    for (let i = 0; i < argv.length; i++) {
      const arg = argv[i];
      if (BROWSER_FLAGS.includes(arg)) {
        const value = argv[i + 1];
        if (value && !value.startsWith("-")) {
          const normalized = value.trim().toLowerCase();
          const browser = BROWSER_TO_TARGET[normalized];
          if (browser) {
            // launch is the specific browser (chrome/edge/brave...), browser is the target (chromium/firefox)
            const launch = (VALID_LAUNCH_TARGETS.has(normalized) ? normalized : undefined) as LaunchTarget | undefined;
            return { browser, launch, specified: true };
          }
          return { unknown: value, specified: true };
        }
      }
      if (arg.startsWith("-b=") || arg.startsWith("--browser=")) {
        const normalized = (arg.split("=")[1] ?? "").trim().toLowerCase();
        const browser = BROWSER_TO_TARGET[normalized];
        if (browser) {
          const launch = (VALID_LAUNCH_TARGETS.has(normalized) ? normalized : undefined) as LaunchTarget | undefined;
          return { browser, launch, specified: true };
        }
        return { unknown: normalized, specified: true };
      }
    }
    return { specified: false };
  }

  private getCacheFromArgv(argv: string[]): boolean | undefined {
    let cache: boolean | undefined;
    for (const arg of argv) {
      if (arg === "-c" || arg === "--cache") cache = true;
      if (arg === "--no-cache") cache = false;
    }
    return cache;
  }

  private getDebugFromArgv(argv: string[]): true | undefined {
    return argv.some((arg) => arg === "--debug") ? true : undefined;
  }

  private getReportFromArgv(argv: string[]): true | undefined {
    return argv.some((arg) => REPORT_FLAGS.includes(arg)) ? true : undefined;
  }

  private getOpenFromArgv(argv: string[]): boolean {
    return !argv.some((arg) => arg === "--no-open");
  }

  private getPortFromArgv(argv: string[]): number | undefined {
    for (let i = 0; i < argv.length; i++) {
      const value = this.readPortValue(argv, i);
      if (value !== undefined) return this.parsePort(value);
    }
    return undefined;
  }

  private readPortValue(argv: string[], index: number): string | undefined {
    const arg = argv[index];
    if (arg === PORT_FLAG) {
      const value = argv[index + 1];
      return value && !value.startsWith("-") ? value : "";
    }
    return arg.startsWith(`${PORT_FLAG}=`) ? arg.slice(PORT_FLAG.length + 1) : undefined;
  }

  private parsePort(value: string): number {
    const port = Number(value);
    if (Number.isInteger(port) && port > 0 && port <= 65535) return port;
    throw new AddfoxError({
      code: ADDFOX_ERROR_CODES.INVALID_ARGUMENT,
      message: "Invalid --port value",
      details: `Current value: "${value}"`,
      hint: "Use --port <1-65535>, for example: addfox dev --port 3001",
    });
  }

  assertSupportedBrowser(value: string): asserts value is BrowserTarget {
    const b = BROWSER_TO_TARGET[value.trim().toLowerCase()];
    if (b) return;
    throw new AddfoxError({
      code: ADDFOX_ERROR_CODES.INVALID_BROWSER,
      message: "Unsupported browser argument",
      details: `Current value: "${value}"`,
      hint:
        "Use -b chrome/chromium/edge/brave/vivaldi/opera/santa/arc/yandex/browseros/custom/firefox/zen or --browser=...; use custom only with browser.custom in config",
    });
  }
}

const defaultParser: CliParser = new CliParser();

export function parseCliArgs(argv: string[]): CliParseResult {
  return defaultParser.parse(argv);
}

export function assertSupportedBrowser(value: string): asserts value is BrowserTarget {
  defaultParser.assertSupportedBrowser(value);
}
