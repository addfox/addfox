import { describe, expect, it } from "@rstest/core";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("package.json configuration", () => {
  const pkg = JSON.parse(
    readFileSync(resolve(process.cwd(), "package.json"), "utf-8"),
  ) as {
    main?: string;
    exports?: Record<string, string>;
    bin?: Record<string, string>;
  };

  it("has main pointing to dist/index.js", () => {
    expect(pkg.main).toBe("./dist/index.js");
  });

  it("has exports for . and ./cli", () => {
    expect(pkg.exports?.["."]).toBe("./dist/index.js");
    expect(pkg.exports?.["./cli"]).toBe("./dist/cli.js");
  });

  it("preserves bin entry for create-addfox-app", () => {
    expect(pkg.bin?.["create-addfox-app"]).toBe("./dist/cli.js");
  });
});
