/** Type declaration: web-ext is used via dynamic import; see cmd.run docs. */
declare module "web-ext" {
  interface RunOptions {
    sourceDir: string;
    target: string;
    firefox?: string;
    chromiumBinary?: string;
    startUrl?: string;
    devtools?: boolean;
    browserConsole?: boolean;
    /** When true, disable web-ext automatic reload on source file changes. */
    noReload?: boolean;
    /**
     * When true, do not use stdin raw mode / keypress loop (R reload, Ctrl+C handled there).
     * Prefer true when embedding in another CLI (e.g. addfox) so SIGINT stays with the parent process.
     */
    noInput?: boolean;
    /** Verbose logging (same as CLI --verbose). */
    verbose?: boolean;
  }
  interface RunResult {
    exit(): Promise<void>;
    /** MultiExtensionRunner: reload all managed extensions (Firefox remote protocol). */
    reloadAllExtensions?: () => Promise<unknown>;
    /** MultiExtensionRunner: run after managed runner(s) shut down (Firefox child `close`). */
    registerCleanup?(fn: () => void): void;
    /** Optional: promise that resolves when the Firefox process exits (web-ext may provide this). */
    exitPromise?: Promise<void>;
    /** Optional: Node ChildProcess for the Firefox instance; listen to "exit" to terminate dev when browser closes. */
    browserProcess?: { on(event: string, handler: () => void): void };
  }
  interface WebExt {
    cmd: {
      run(
        options: RunOptions,
        opts: { shouldExitProgram: boolean }
      ): Promise<RunResult>;
    };
  }
  const webExt: WebExt;
  export default webExt;
}
