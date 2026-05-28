import { describe, expect, it } from "@rstest/core";
import { parseArgv } from "../src/lib/minimist.ts";

describe("parseArgv", () => {
  it("parses positional args", () => {
    const res = parseArgv(["foo", "bar"]);
    expect(res._).toEqual(["foo", "bar"]);
  });

  it("parses --key=value", () => {
    const res = parseArgv(["--name=project"]);
    expect(res.name).toBe("project");
  });

  it("parses --key with next arg as value", () => {
    const res = parseArgv(["--framework", "react"]);
    expect(res.framework).toBe("react");
  });

  it("parses boolean flags", () => {
    const res = parseArgv(["--help"]);
    expect(res.help).toBe(true);
  });

  it("parses short flags", () => {
    const res = parseArgv(["-h"]);
    expect(res.h).toBe(true);
  });

  it("parses combined short flags", () => {
    const res = parseArgv(["-abc"]);
    expect(res.a).toBe(true);
    expect(res.b).toBe(true);
    expect(res.c).toBe(true);
  });

  it("parses short flag with value", () => {
    const res = parseArgv(["-n", "foo"]);
    expect(res.n).toBe("foo");
  });

  it("parses numeric values", () => {
    const res = parseArgv(["--count", "42"]);
    expect(res.count).toBe(42);
  });

  it("handles -- separator", () => {
    const res = parseArgv(["--framework", "react", "--", "extra", "arg"]);
    expect(res.framework).toBe("react");
    expect(res._).toEqual(["extra", "arg"]);
  });

  it("parses numeric positional args", () => {
    const res = parseArgv(["123"]);
    expect(res._).toEqual([123]);
  });
});
