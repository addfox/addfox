import { launchChromium } from "@addfox/launcher";

export type ChromiumRunnerOptions = {
  target?: string;
  chromePath: string | undefined;
  extensions: string[];
  startUrl?: string;
  userDataDir?: string;
  args?: string[];
  verbose?: boolean;
  extensionLoadMode?: "cdp" | "load-extension";
  onExit?: () => void;
};

export async function runChromiumRunner(
  options: ChromiumRunnerOptions
): Promise<{ exit: () => Promise<void> }> {
  const browserProcess = await launchChromium({
    target: (options.target as any) ?? "chrome",
    binaryPath: options.chromePath,
    extensionPaths: options.extensions,
    startUrl: options.startUrl,
    userDataDir: options.userDataDir,
    args: options.args,
    verbose: options.verbose,
    extensionLoadMode: options.extensionLoadMode,
    onExit: options.onExit,
  });
  return {
    exit: () => browserProcess.exit(),
  };
}
