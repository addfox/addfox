import {
  Launcher as ChromeLauncher,
  launch as defaultChromiumLaunch,
} from "chrome-launcher";
import type { LaunchedChrome } from "chrome-launcher";
import { error as addfoxError } from "@addfox/common";

const EXCLUDED_CHROME_FLAGS = [
  "--disable-extensions",
  "--mute-audio",
  "--disable-component-update",
];

const DEFAULT_CHROME_FLAGS = ChromeLauncher.defaultFlags().filter(
  (flag) => !EXCLUDED_CHROME_FLAGS.includes(flag)
);

type DeferredResponse = {
  method: string;
  resolve: (result: unknown) => void;
  reject: (error: Error) => void;
};

type ChromiumInstance = LaunchedChrome & {
  remoteDebuggingPipes: {
    incoming: NodeJS.ReadableStream & { closed?: boolean };
    outgoing: NodeJS.WritableStream;
  } | null;
};

class ChromeDevtoolsProtocolClient {
  private receivedData = "";
  private isProcessing = false;
  private lastId = 0;
  private deferredResponses = new Map<number, DeferredResponse>();
  private disconnected = false;
  private resolveDisconnected!: () => void;
  private disconnectedPromise = new Promise<void>((resolve) => {
    this.resolveDisconnected = resolve;
  });
  private outgoingPipe: NodeJS.WritableStream;

  constructor(chromiumInstance: ChromiumInstance) {
    const pipes = chromiumInstance.remoteDebuggingPipes;
    if (!pipes) {
      throw new Error("remoteDebuggingPipes is not available");
    }
    const { incoming, outgoing } = pipes;
    this.outgoingPipe = outgoing;
    if (incoming.closed) {
      this.finalizeDisconnect();
      return;
    }
    incoming.on("data", (data) => this.onIncomingData(data));
    incoming.on("error", (error) => this.handleIncomingError(error));
    incoming.on("close", () => this.finalizeDisconnect());
  }

  waitUntilDisconnected(): Promise<void> {
    return this.disconnectedPromise;
  }

  async sendCommand(
    method: string,
    params: Record<string, unknown> = {},
    sessionId?: string
  ): Promise<unknown> {
    this.ensureConnected(method);
    const message = this.buildMessage(method, params, sessionId);
    return this.sendMessage(message);
  }

  private ensureConnected(method: string): void {
    if (!this.disconnected) return;
    throw new Error(`CDP disconnected, cannot send: command ${method}`);
  }

  private buildMessage(
    method: string,
    params: Record<string, unknown>,
    sessionId?: string
  ): { id: number; method: string; rawMessage: string } {
    const id = ++this.lastId;
    const message = { id, method, params, sessionId };
    const rawMessage = `${JSON.stringify(message)}\x00`;
    return { id, method, rawMessage };
  }

  private sendMessage(message: { id: number; method: string; rawMessage: string }) {
    return new Promise((resolve, reject) => {
      this.deferredResponses.set(message.id, {
        method: message.method,
        resolve,
        reject,
      });
      this.outgoingPipe.write(message.rawMessage);
    });
  }

  private onIncomingData(data: Buffer): void {
    this.receivedData += data;
    this.processNextMessage();
  }

  private handleIncomingError(err: unknown): void {
    addfoxError(err);
    this.finalizeDisconnect();
  }

  private processNextMessage(): void {
    if (this.isProcessing) return;
    this.isProcessing = true;
    let end = this.receivedData.indexOf("\x00");
    while (end !== -1) {
      const rawMessage = this.receivedData.slice(0, end);
      this.receivedData = this.receivedData.slice(end + 1);
      this.handleRawMessage(rawMessage);
      end = this.receivedData.indexOf("\x00");
    }
    this.isProcessing = false;
    if (this.disconnected) this.resolvePending();
  }

  private handleRawMessage(rawMessage: string): void {
    const parsed = this.parseMessage(rawMessage);
    if (!parsed) return;
    const { id, error, result } = parsed;
    const deferred = this.deferredResponses.get(id);
    if (!deferred) return;
    this.deferredResponses.delete(id);
    if (error) deferred.reject(new Error(error.message || "Unexpected CDP response"));
    else deferred.resolve(result);
  }

  private parseMessage(rawMessage: string): { id: number; error?: { message?: string }; result?: unknown } | null {
    try {
      return JSON.parse(rawMessage);
    } catch (e) {
      addfoxError(e);
      return null;
    }
  }

  private finalizeDisconnect(): void {
    if (this.disconnected) return;
    this.disconnected = true;
    this.processNextMessage();
  }

  private resolvePending(): void {
    for (const { method, reject } of this.deferredResponses.values()) {
      reject(new Error(`CDP connection closed before response to ${method}`));
    }
    this.deferredResponses.clear();
    this.resolveDisconnected();
  }
}

export type ChromiumRunnerOptions = {
  chromePath: string;
  extensions: string[];
  startUrl?: string;
  userDataDir?: string;
  args?: string[];
  verbose?: boolean;
  onExit?: () => void;
};

class ChromiumExtensionRunner {
  private chromiumLaunch;
  private options: ChromiumRunnerOptions;
  private chromiumInstance: ChromiumInstance | null = null;
  private cdp: ChromeDevtoolsProtocolClient | null = null;
  private forceUseDeprecatedLoadExtension = false;
  private exiting = false;
  private setupPromise: Promise<void> | null = null;

  constructor(
    options: ChromiumRunnerOptions,
    chromiumLaunch = defaultChromiumLaunch
  ) {
    this.options = options;
    this.chromiumLaunch = chromiumLaunch;
  }

  async run(): Promise<void> {
    this.setupPromise = this.setupInstance();
    await this.setupPromise;
  }

  async exit(): Promise<void> {
    this.exiting = true;
    await this.awaitSetup();
    await this.killInstance();
    await this.disconnectCdp();
  }

  private async awaitSetup(): Promise<void> {
    if (!this.setupPromise) return;
    await this.setupPromise.catch((err) => {
      console.debug(`ignored setup error on chromium runner shutdown: ${err}`);
    });
  }

  private async setupInstance(): Promise<void> {
    const chromeFlags = buildChromeFlags({
      extensions: this.options.extensions,
      args: this.options.args,
      useDeprecatedLoadExtension: this.forceUseDeprecatedLoadExtension,
    });
    const instance = await this.launchChrome(chromeFlags);
    this.attachInstance(instance);
    const loaded = await this.loadExtensions();
    if (!loaded) {
      await this.fallbackToDeprecatedLoad(instance);
      return;
    }
  }

  private async launchChrome(chromeFlags: string[]): Promise<ChromiumInstance> {
    return this.chromiumLaunch({
      chromePath: this.options.chromePath,
      chromeFlags,
      startingUrl: this.options.startUrl,
      userDataDir: this.options.userDataDir,
      logLevel: this.options.verbose ? "verbose" : "silent",
      ignoreDefaultFlags: true,
    });
  }

  private attachInstance(instance: ChromiumInstance): void {
    this.chromiumInstance = instance;
    this.cdp = new ChromeDevtoolsProtocolClient(instance);
    this.listenToProcessClose(instance);
  }

  private listenToProcessClose(instance: ChromiumInstance): void {
    const initial = instance;
    instance.process.once("close", () => {
      if (this.chromiumInstance !== initial) return;
      this.chromiumInstance = null;
      if (this.options.onExit) this.options.onExit();
      if (!this.exiting) this.exit().catch(() => {});
    });
  }

  private async loadExtensions(): Promise<boolean> {
    if (!this.cdp) return false;
    if (this.forceUseDeprecatedLoadExtension) return true;
    return this.loadExtensionsViaCdp(this.cdp, this.options.extensions);
  }

  private async loadExtensionsViaCdp(
    cdp: ChromeDevtoolsProtocolClient,
    extensions: string[]
  ): Promise<boolean> {
    for (const sourceDir of extensions) {
      const result = await this.tryLoadExtension(cdp, sourceDir);
      if (result === "unsupported") return false;
    }
    return true;
  }

  private async tryLoadExtension(
    cdp: ChromeDevtoolsProtocolClient,
    sourceDir: string
  ): Promise<"ok" | "unsupported"> {
    try {
      await cdp.sendCommand("Extensions.loadUnpacked", { path: sourceDir });
      return "ok";
    } catch (e) {
      if (isLoadUnpackedUnsupported(e)) return "unsupported";
      addfoxError("Failed to load extension at", sourceDir, String(e));
      throw e;
    }
  }

  private async fallbackToDeprecatedLoad(instance: ChromiumInstance): Promise<void> {
    this.forceUseDeprecatedLoadExtension = true;
    this.chromiumInstance = null;
    await instance.kill();
    await this.disconnectCdp();
    await this.setupInstance();
  }

  private async disconnectCdp(): Promise<void> {
    if (!this.cdp) return;
    await this.cdp.waitUntilDisconnected();
    this.cdp = null;
  }

  private async killInstance(): Promise<void> {
    if (!this.chromiumInstance) return;
    await this.chromiumInstance.kill();
    this.chromiumInstance = null;
  }
}

function isLoadUnpackedUnsupported(error: unknown): boolean {
  return error instanceof Error && error.message === "'Extensions.loadUnpacked' wasn't found";
}

function buildChromeFlags(options: {
  extensions: string[];
  args?: string[];
  useDeprecatedLoadExtension: boolean;
}): string[] {
  const flags = [...DEFAULT_CHROME_FLAGS, "--remote-debugging-pipe"];
  if (options.useDeprecatedLoadExtension) {
    flags.push(`--load-extension=${options.extensions.join(",")}`);
  } else {
    flags.push("--enable-unsafe-extension-debugging");
  }
  if (options.args?.length) flags.push(...options.args);
  return flags;
}

export async function runChromiumRunner(
  options: ChromiumRunnerOptions
): Promise<{ exit: () => Promise<void> }> {
  const runner = new ChromiumExtensionRunner(options);
  await runner.run();
  return { exit: () => runner.exit() };
}
