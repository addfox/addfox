import { describe, expect, it } from "@rstest/core";
import minimist from "../src/lib/minimist.ts";

describe("minimist", () => {
  it("parses positional args into _", () => {
    const argv = minimist(["my-project", "extra"]);
    expect(argv._).toEqual(["my-project", "extra"]);
  });

  it("parses --flag as boolean true", () => {
    const argv = minimist(["--help"]);
    expect(argv.help).toBe(true);
    expect(argv._).toEqual([]);
  });

  it("parses --flag=value as string", () => {
    const argv = minimist(["--framework=vue"]);
    expect(argv.framework).toBe("vue");
  });

  it("parses -f short flags as boolean true", () => {
    const argv = minimist(["-h"]);
    expect(argv.h).toBe(true);
  });

  it("parses -f with following value as string", () => {
    const argv = minimist(["-n", "my-project"]);
    expect(argv.n).toBe("my-project");
    expect(argv._).toEqual([]);
  });

  it("stops parsing after -- and collects the rest in _", () => {
    const argv = minimist(["--framework", "vue", "--", "--not-a-flag"]);
    expect(argv.framework).toBe("vue");
    expect(argv._).toEqual(["--not-a-flag"]);
  });

  it("parses false string as boolean false", () => {
    const argv = minimist(["--flag=false"]);
    expect(argv.flag).toBe(false);
  });

  it("returns empty object for no args", () => {
    const argv = minimist([]);
    expect(argv._).toEqual([]);
  });
});
