import { describe, expect, it } from "@rstest/core";
import { mkdtempSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

import { detectFrontendFramework } from "../src/frameworkDetect.ts";

function makeProjectRoot(pkgJson: unknown): string {
  const root = mkdtempSync(join(tmpdir(), "addfox-fdetect-"));
  writeFileSync(join(root, "package.json"), JSON.stringify(pkgJson), "utf-8");
  return root;
}

describe("detectFrontendFramework", () => {
  it("returns Vanilla when root is empty", () => {
    expect(detectFrontendFramework("")).toBe("Vanilla");
  });

  it("returns Vanilla when package.json missing", () => {
    const root = mkdtempSync(join(tmpdir(), "addfox-fdetect-missing-"));
    expect(detectFrontendFramework(root)).toBe("Vanilla");
  });

  it("returns first-match key order (solid-js before react)", () => {
    const root = makeProjectRoot({
      dependencies: {
        react: "^19.0.0",
        "solid-js": "^1.0.0",
      },
    });
    expect(detectFrontendFramework(root)).toBe("Solid");
  });

  it("detects framework from devDependencies", () => {
    const root = makeProjectRoot({
      devDependencies: {
        react: "^19.0.0",
      },
    });
    expect(detectFrontendFramework(root)).toBe("React");
  });

  it("returns Vanilla when no framework deps found", () => {
    const root = makeProjectRoot({
      dependencies: {
        lodash: "^4.0.0",
      },
    });
    expect(detectFrontendFramework(root)).toBe("Vanilla");
  });
});

