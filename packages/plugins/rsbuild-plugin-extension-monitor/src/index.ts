import type { RsbuildPluginAPI } from "@rsbuild/core";
import type { AddfoxResolvedConfig, EntryInfo, BrowserTarget } from "@addfox/core";
import { HTML_ENTRY_NAMES } from "@addfox/core";

const INJECT_MARKER = "/* addfox-monitor */";

/** Options for a single entry's monitor injection (no runtime detection; derived from entry name). */
function getMonitorEntryOpts(entryName: string): { registerShortcut: boolean } {
  return { registerShortcut: entryName === "background" };
}

function shouldInjectAddfoxWsReload(
  browser: BrowserTarget,
  hotReload: AddfoxResolvedConfig["hotReload"]
): boolean {
  if (browser !== "chromium") return false;
  return hotReload !== false;
}

/** Build the inline injection code for an entry */
function buildInjectionSnippet(
  entryName: string,
  opts: { registerShortcut: boolean; injectAddfoxWsReload: boolean }
): string {
  const entryValue = JSON.stringify(entryName);
  const setupCall = `setupAddfoxMonitor({ entry: ${entryValue} });`;
  if (entryName === "background") {
    if (opts.injectAddfoxWsReload) {
      return `${INJECT_MARKER}
import { setupAddfoxMonitor, startHmrReloadClient } from "addfox/monitor";
${setupCall}
startHmrReloadClient();
`;
    }
    return `${INJECT_MARKER}
import { setupAddfoxMonitor } from "addfox/monitor";
${setupCall}
`;
  }
  return `${INJECT_MARKER}
import { setupAddfoxMonitor } from "addfox/monitor";
${setupCall}
`;
}

type RsbuildEntryValue =
  | string
  | {
      import: string | string[];
      html?: boolean;
    };

/**
 * Encapsulates the addfox dev monitor: entry injection only (inline code, no virtual modules).
 * No UI: errors are forwarded from background to dev server and logged to terminal.
 */
export class AddfoxMonitorPlugin {
  private readonly entryNames: string[];

  constructor(
    private readonly _resolvedConfig: AddfoxResolvedConfig,
    entries: EntryInfo[],
    private readonly _browser: BrowserTarget = "chromium"
  ) {
    this.entryNames = entries.map((e) => e.name);
  }

  toRsbuildPlugin(): { name: string; enforce: "post"; setup: (api: RsbuildPluginAPI) => void } {
    const self = this;
    
    return {
      name: "rsbuild-plugin-extension-monitor",
      enforce: "post" as const,
      setup(api: RsbuildPluginAPI) {
        // Use transformLoader to inject monitor code into each entry
        api.modifyRsbuildConfig((config) => {
          const source = config.source ?? {};
          const entry = source.entry as Record<string, RsbuildEntryValue> | undefined;

          if (!entry) return;
          
          const namesToInject =
            self.entryNames.length > 0 ? self.entryNames : Object.keys(entry);
          
          // Store injection snippets for each entry
          const injectionSnippets: Record<string, string> = {};
          const injectAddfoxWsReload = shouldInjectAddfoxWsReload(
            self._browser,
            self._resolvedConfig.hotReload
          );
          for (const entryName of namesToInject) {
            const opts = getMonitorEntryOpts(entryName);
            injectionSnippets[entryName] = buildInjectionSnippet(entryName, {
              ...opts,
              injectAddfoxWsReload,
            });
          }
          
          // Use BannerPlugin to inject code at the top of each entry chunk
          // We need to use a different approach - modify the entry to prepend the injection
          const nextEntry: Record<string, RsbuildEntryValue> = {};
          for (const [key, value] of Object.entries(entry)) {
            const snippet = injectionSnippets[key];

            if (!snippet) {
              nextEntry[key] = value;
              continue;
            }

            // Create a virtual module path using webpack's inline loader syntax
            // This creates a virtual module without needing VirtualModulesPlugin
            const needsHtml = (HTML_ENTRY_NAMES as readonly string[]).includes(key);
            
            if (typeof value === "string") {
              nextEntry[key] = { 
                import: [`data:text/javascript,${encodeURIComponent(snippet)}`, value], 
                html: needsHtml 
              };
              continue;
            }
            if (value && typeof value === "object" && Array.isArray(value.import)) {
              nextEntry[key] = { 
                ...value, 
                import: [`data:text/javascript,${encodeURIComponent(snippet)}`, ...value.import] 
              };
              continue;
            }
            if (value && typeof value === "object" && typeof value.import === "string") {
              nextEntry[key] = { 
                ...value, 
                import: [`data:text/javascript,${encodeURIComponent(snippet)}`, value.import] 
              };
              continue;
            }
            
            nextEntry[key] = value;
          }
          
          config.source = { ...source, entry: nextEntry };
        });
      },
    };
  }
}

export function monitorPlugin(
  resolvedConfig: AddfoxResolvedConfig,
  entries: EntryInfo[],
  browser: BrowserTarget = "chromium"
) {
  const plugin = new AddfoxMonitorPlugin(resolvedConfig, entries, browser);
  return plugin.toRsbuildPlugin();
}
