import { getWebExtStdoutOriginDepth } from "@addfox/common";

/** ANSI: orange (256 color 208), then reset. Exported for tests. */
export const ADDFOX_PREFIX = "\x1b[38;5;208m[Addfox]\x1b[0m ";
/** Light purple [Rsbuild] for rsbuild-origin lines (256 color 141) */
const RSBUILD_PREFIX = "\x1b[38;5;141m[Rsbuild]\x1b[0m ";
/** Cyan [Web-ext] for web-ext-origin lines (256 color 45) */
const WEBEXT_PREFIX = "\x1b[38;5;45m[Web-ext]\x1b[0m ";

let rawStdoutWrite: NodeJS.WriteStream["write"] | null = null;
let rawStderrWrite: NodeJS.WriteStream["write"] | null = null;

/** "addfox" | "rsbuild" — which prefix to use for wrapped stdout/stderr (non-logger output). */
let outputPrefix: "addfox" | "rsbuild" = "addfox";

/**
 * Use [Rsbuild] prefix for subsequent stdout/stderr lines (e.g. before createRsbuild / startDevServer).
 * Call setOutputPrefixAddfox() after build() to restore [Addfox] for non-rsbuild output.
 */
export function setOutputPrefixRsbuild(): void {
  outputPrefix = "rsbuild";
}

/**
 * Use [Addfox] prefix for subsequent stdout/stderr lines. Call after rsbuild.build() when only addfox will write.
 */
export function setOutputPrefixAddfox(): void {
  outputPrefix = "addfox";
}

/** Return raw stream writes (before wrap) for the shared logger so output has a single prefix. */
export function getRawWrites(): {
  stdout: NodeJS.WriteStream["write"];
  stderr: NodeJS.WriteStream["write"];
} {
  return {
    stdout: rawStdoutWrite ?? process.stdout.write.bind(process.stdout),
    stderr: rawStderrWrite ?? process.stderr.write.bind(process.stderr),
  };
}

type Encoding = BufferEncoding | ((err?: Error) => void);
type WriteCallback = (err?: Error) => void;

function isEncoding(x: Encoding | undefined): x is BufferEncoding {
  return typeof x === "string";
}

/** Exported for tests. */
export function createPrefixedWrite(
  stream: NodeJS.WriteStream,
  getPrefix: (line: string) => string
): NodeJS.WriteStream["write"] {
  const originalWrite = stream.write.bind(stream);
  let buffer = "";

  function flushIncomplete() {
    if (buffer.length > 0) {
      originalWrite(getPrefix(buffer) + buffer);
      buffer = "";
    }
  }

  const write: NodeJS.WriteStream["write"] = function (
    chunk: string | Buffer | Uint8Array,
    encodingOrCallback?: Encoding,
    callback?: WriteCallback
  ): boolean {
    const encoding: BufferEncoding | undefined = isEncoding(encodingOrCallback)
      ? encodingOrCallback
      : undefined;
    const cb = typeof encodingOrCallback === "function" ? encodingOrCallback : callback;
    const str = typeof chunk === "string" ? chunk : chunk.toString(encoding ?? "utf8");
    buffer += str;
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      originalWrite(getPrefix(line) + line + "\n", encoding as BufferEncoding);
    }
    if (typeof cb === "function") cb();
    return true;
  };

  (write as { flush?: () => void }).flush = flushIncomplete;
  return write;
}

/**
 * Wraps process.stdout and process.stderr so each line is prefixed with colored "[Addfox]" or "[Rsbuild]".
 * Call before running rsbuild dev/build. Use setOutputPrefixRsbuild() before rsbuild, setOutputPrefixAddfox() after build.
 */
export function wrapAddfoxOutput(): void {
  rawStdoutWrite = process.stdout.write.bind(process.stdout);
  rawStderrWrite = process.stderr.write.bind(process.stderr);

  const getPrefix = (_line: string): string => {
    if (outputPrefix === "rsbuild" && getWebExtStdoutOriginDepth() > 0) {
      return WEBEXT_PREFIX;
    }
    return outputPrefix === "rsbuild" ? RSBUILD_PREFIX : ADDFOX_PREFIX;
  };
  const stdoutWrite = createPrefixedWrite(process.stdout, getPrefix);
  const stderrWrite = createPrefixedWrite(process.stderr, getPrefix);

  (process.stdout as NodeJS.WriteStream & { write: NodeJS.WriteStream["write"] }).write = stdoutWrite;
  (process.stderr as NodeJS.WriteStream & { write: NodeJS.WriteStream["write"] }).write = stderrWrite;

  const flush = () => {
    const fOut = (stdoutWrite as { flush?: () => void }).flush;
    const fErr = (stderrWrite as { flush?: () => void }).flush;
    if (fOut) fOut();
    if (fErr) fErr();
  };

  process.once("exit", flush);
}
