import { describe, expect, it, beforeEach, afterEach } from "@rstest/core";
import { pushWebExtStdoutOrigin, popWebExtStdoutOrigin } from "@addfox/common";
import {
  wrapAddfoxOutput,
  createPrefixedWrite,
  getRawWrites,
  ADDFOX_PREFIX,
  setOutputPrefixRsbuild,
  setOutputPrefixAddfox,
} from "../src/utils/index.ts";

const PREFIX = ADDFOX_PREFIX;

describe("prefixStream", () => {
  let stdoutChunks: string[];
  let stderrChunks: string[];
  let originalStdoutWrite: typeof process.stdout.write;
  let originalStderrWrite: typeof process.stderr.write;

  function captureWrite(stream: "stdout" | "stderr") {
    const chunks = stream === "stdout" ? stdoutChunks : stderrChunks;
    const target = stream === "stdout" ? process.stdout : process.stderr;
    const original = target.write.bind(target);
    (target as NodeJS.WriteStream).write = (
      chunk: string | Buffer | Uint8Array,
      encodingOrCallback?: BufferEncoding | ((err?: Error) => void),
      callback?: (err?: Error) => void
    ): boolean => {
      chunks.push(typeof chunk === "string" ? chunk : chunk.toString("utf8"));
      const cb = typeof encodingOrCallback === "function" ? encodingOrCallback : callback;
      if (typeof cb === "function") cb();
      return true;
    };
    return original;
  }

  beforeEach(() => {
    stdoutChunks = [];
    stderrChunks = [];
    originalStdoutWrite = captureWrite("stdout");
    originalStderrWrite = captureWrite("stderr");
  });

  afterEach(() => {
    (process.stdout as NodeJS.WriteStream).write = originalStdoutWrite;
    (process.stderr as NodeJS.WriteStream).write = originalStderrWrite;
  });

  it("wrapAddfoxOutput does not throw", () => {
    expect(() => wrapAddfoxOutput()).not.toThrow();
  });

  it("after wrap, stdout line is prefixed", () => {
    wrapAddfoxOutput();
    (process.stdout as NodeJS.WriteStream).write("hello\n");
    const out = stdoutChunks.join("");
    expect(out).toContain(PREFIX);
    expect(out).toContain("hello");
  });

  it("after wrap, stderr line is prefixed", () => {
    wrapAddfoxOutput();
    (process.stderr as NodeJS.WriteStream).write("err\n");
    const out = stderrChunks.join("");
    expect(out).toContain(PREFIX);
    expect(out).toContain("err");
  });

  it("write with encoding and callback", () => {
    wrapAddfoxOutput();
    (process.stdout as NodeJS.WriteStream).write("a\n", "utf8", () => {});
    expect(stdoutChunks.join("")).toContain("a");
  });

  it("write with callback as second arg", () => {
    wrapAddfoxOutput();
    (process.stdout as NodeJS.WriteStream).write("b\n", () => {});
    expect(stdoutChunks.join("")).toContain("b");
  });

  it("write with Buffer chunk", () => {
    wrapAddfoxOutput();
    (process.stdout as NodeJS.WriteStream).write(Buffer.from("buf\n"));
    expect(stdoutChunks.join("")).toContain("buf");
  });

  it("flush writes incomplete buffer", () => {
    wrapAddfoxOutput();
    (process.stdout as NodeJS.WriteStream).write("no-newline");
    const write = (process.stdout as NodeJS.WriteStream).write as { flush?: () => void };
    if (write.flush) write.flush();
    expect(stdoutChunks.join("")).toContain("no-newline");
  });

  it("exit handler invokes flush", () => {
    wrapAddfoxOutput();
    (process.stdout as NodeJS.WriteStream).write("pending");
    const listeners = process.rawListeners("exit");
    const flush = listeners[listeners.length - 1];
    if (typeof flush === "function") {
      process.removeListener("exit", flush);
      (flush as (code?: number) => void)(0);
    }
    expect(stdoutChunks.join("")).toContain("pending");
  });

  it("createPrefixedWrite write with chunk and callback only invokes callback", () => {
    const chunks: string[] = [];
    const stream = {
      write: (chunk: string | Buffer, _enc?: BufferEncoding, cb?: (err?: Error) => void) => {
        chunks.push(typeof chunk === "string" ? chunk : chunk.toString("utf8"));
        if (typeof cb === "function") cb();
        return true;
      },
    } as unknown as NodeJS.WriteStream;
    const write = createPrefixedWrite(stream, () => PREFIX);
    write("line\n", () => {});
    expect(chunks.join("")).toContain(PREFIX);
    expect(chunks.join("")).toContain("line");
  });

  it("createPrefixedWrite write with Buffer uses encoding", () => {
    const chunks: string[] = [];
    const stream = {
      write: (chunk: string | Buffer, _enc?: BufferEncoding, cb?: (err?: Error) => void) => {
        chunks.push(typeof chunk === "string" ? chunk : chunk.toString("utf8"));
        if (typeof cb === "function") cb();
        return true;
      },
    } as unknown as NodeJS.WriteStream;
    const write = createPrefixedWrite(stream, () => PREFIX);
    write(Buffer.from("buf\n"));
    expect(chunks.join("")).toContain("buf");
  });

  it("createPrefixedWrite flush when no pending buffer does not throw", () => {
    const stream = {
      write: (_chunk: string | Buffer, _enc?: BufferEncoding, cb?: (err?: Error) => void) => {
        if (typeof cb === "function") cb();
        return true;
      },
    } as unknown as NodeJS.WriteStream;
    const write = createPrefixedWrite(stream, () => PREFIX);
    const flush = (write as { flush?: () => void }).flush;
    expect(flush).toBeDefined();
    expect(() => flush!()).not.toThrow();
  });

  it("getRawWrites before wrap returns fallback process stream writes", () => {
    const { stdout, stderr } = getRawWrites();
    expect(typeof stdout).toBe("function");
    expect(typeof stderr).toBe("function");
  });

  it("setOutputPrefixRsbuild switches prefix to [Rsbuild] and setOutputPrefixAddfox restores [Addfox]", () => {
    wrapAddfoxOutput();
    setOutputPrefixRsbuild();
    (process.stdout as NodeJS.WriteStream).write("rsbuild-line\n");
    const rsbuildOut = stdoutChunks.join("");
    expect(rsbuildOut).toContain("[Rsbuild]");
    expect(rsbuildOut).toContain("rsbuild-line");

    stdoutChunks.length = 0;
    setOutputPrefixAddfox();
    (process.stdout as NodeJS.WriteStream).write("addfox-line\n");
    const addfoxOut = stdoutChunks.join("");
    expect(addfoxOut).toContain(PREFIX);
    expect(addfoxOut).toContain("addfox-line");
  });

  it("setOutputPrefixRsbuild uses [Web-ext] when web-ext stdout origin depth > 0", () => {
    wrapAddfoxOutput();
    setOutputPrefixRsbuild();
    pushWebExtStdoutOrigin();
    (process.stdout as NodeJS.WriteStream).write("any line from web-ext pino\n");
    popWebExtStdoutOrigin();
    const out = stdoutChunks.join("");
    expect(out).toContain("[Web-ext]");
    expect(out).toContain("any line from web-ext pino");
  });

  it("getRawWrites after wrap returns raw write functions", () => {
    wrapAddfoxOutput();
    const { stdout, stderr } = getRawWrites();
    expect(typeof stdout).toBe("function");
    expect(typeof stderr).toBe("function");
    (stdout as NodeJS.WriteStream["write"])("raw\n");
    expect(stdoutChunks.join("")).toContain("raw");
  });
});
