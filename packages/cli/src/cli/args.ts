import {
  CLI_COMMANDS,
  type BrowserTarget,
  type CliCommand,
  type LaunchTarget,
} from "@addfox/core";
import { AddfoxError, ADDFOX_ERROR_CODES } from "@addfox/common";

const BROWSER_FLAGS = ["-b", "--browser"];
const REPORT_FLAGS = ["-r", "--report"];

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
};

/** Valid launch targets (browser names that can be launched) */
const VALID_LAUNCH_TARGETS = new Set([
  "chrome", "chromium", "edge", "brave", "vivaldi", "opera",
  "santa", "arc", "yandex", "browseros", "custom", "firefox",
]);

export interface CliParseResult {
  command: CliCommand;
  /** Browser target for manifest (chromium/firefox) */
  browser?: BrowserTarget;
  /** Specific browser to launch (chrome/chromium/edge/brave/firefox/...) */
  launch?: LaunchTarget;
  unknownBrowser?: string;
  cache?: boolean;
  /** When true, same as debug: true in addfox.config (e.g. enable monitor in dev). From --debug. */
  debug?: boolean;
  /** When true, enable Rsdoctor build report (RSDOCTOR=true). From -r/--report. */
  report?: boolean;
  /** When false, do not auto-open browser. From --no-open. */
  open?: boolean;
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
    const { browser, launch, unknown: unknownBrowser } = this.getBrowserFromArgv(argv);
    const cache = this.getCacheFromArgv(argv);
    const debug = this.getDebugFromArgv(argv);
    const report = this.getReportFromArgv(argv);
    const open = this.getOpenFromArgv(argv);
    return { command, browser, launch, unknownBrowser, cache, debug, report, open };
  }

  private getBrowserFromArgv(argv: string[]): { browser?: BrowserTarget; launch?: LaunchTarget; unknown?: string } {
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
            return { browser, launch };
          }
          return { unknown: value };
        }
      }
      if (arg.startsWith("-b=") || arg.startsWith("--browser=")) {
        const normalized = (arg.split("=")[1] ?? "").trim().toLowerCase();
        const browser = BROWSER_TO_TARGET[normalized];
        if (browser) {
          const launch = (VALID_LAUNCH_TARGETS.has(normalized) ? normalized : undefined) as LaunchTarget | undefined;
          return { browser, launch };
        }
        return { unknown: normalized };
      }
    }
    return {};
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

  assertSupportedBrowser(value: string): asserts value is BrowserTarget {
    const b = BROWSER_TO_TARGET[value.trim().toLowerCase()];
    if (b) return;
    throw new AddfoxError({
      code: ADDFOX_ERROR_CODES.INVALID_BROWSER,
      message: "Unsupported browser argument",
      details: `Current value: "${value}"`,
      hint:
        "Use -b chrome/chromium/edge/brave/vivaldi/opera/santa/arc/yandex/browseros/custom/firefox or --browser=...; use custom only with browser.custom in config",
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
