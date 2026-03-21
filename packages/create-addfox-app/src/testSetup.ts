/**
 * Optional rstest + Rsdoctor setup for scaffolded projects.
 * Versions align with @rstest/core usage in this monorepo.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { readJsonFile, writeJsonFile } from "./jsonFile.ts";
import type { Language } from "./templates.ts";

export type TestKind = "unit" | "e2e";

const RSTEST_CORE = "^0.9.2";
const RSTEST_COVERAGE = "^0.3.0";
const RSTEST_BROWSER = "^0.9.2";
const PLAYWRIGHT = "^1.49.0";
const RSDOCTOR_RSPACK = "^1.5.3";

export interface TestSetupSelection {
  testKinds: TestKind[];
  installRsdoctor: boolean;
}

function getTestExt(language: Language): "ts" | "js" {
  return language === "ts" ? "ts" : "js";
}

function getTestGlob(language: Language): string {
  return language === "ts" ? "__tests__/**/*.test.ts" : "__tests__/**/*.test.js";
}

function getE2eGlob(language: Language): string {
  return language === "ts"
    ? "__tests__/e2e/**/*.test.ts"
    : "__tests__/e2e/**/*.test.js";
}

export function generateRstestConfig(
  language: Language,
  testKinds: TestKind[]
): string {
  const hasUnit = testKinds.includes("unit");
  const hasE2e = testKinds.includes("e2e");
  const ext = getTestExt(language);

  if (!hasUnit && !hasE2e) {
    return "";
  }

  const header = `import { defineConfig } from "@rstest/core";\n\n`;

  if (hasUnit && !hasE2e) {
    const glob = getTestGlob(language);
    return `${header}export default defineConfig({
  testEnvironment: "node",
  include: ["${glob}"],
  exclude: { patterns: ["**/node_modules/**", "**/dist/**"] },
  root: process.cwd(),
});
`;
  }

  if (!hasUnit && hasE2e) {
    const inc = getE2eGlob(language);
    return `${header}export default defineConfig({
  root: process.cwd(),
  projects: [
    {
      name: "browser",
      include: ["${inc}"],
      browser: {
        enabled: true,
        provider: "playwright",
        browser: "chromium",
      },
    },
  ],
});
`;
  }

  const unitGlob = getTestGlob(language);
  const e2eInc = getE2eGlob(language);
  return `${header}export default defineConfig({
  root: process.cwd(),
  projects: [
    {
      name: "node",
      testEnvironment: "node",
      include: ["${unitGlob}"],
      exclude: { patterns: ["**/node_modules/**", "**/dist/**", "__tests__/e2e/**"] },
    },
    {
      name: "browser",
      include: ["${e2eInc}"],
      browser: {
        enabled: true,
        provider: "playwright",
        browser: "chromium",
      },
    },
  ],
});
`;
}

function writeUnitSample(root: string, language: Language): void {
  const ext = getTestExt(language);
  mkdirSync(resolve(root, "__tests__"), { recursive: true });
  const path = resolve(root, "__tests__", `example.test.${ext}`);
  const body =
    language === "ts"
      ? `import { describe, expect, it } from "@rstest/core";

describe("example unit tests", () => {
  it("adds numbers", () => {
    expect(1 + 2).toBe(3);
  });
});
`
      : `import { describe, expect, it } from "@rstest/core";

describe("example unit tests", () => {
  it("adds numbers", () => {
    expect(1 + 2).toBe(3);
  });
});
`;
  writeFileSync(path, body, "utf-8");
}

function writeE2eSample(root: string, language: Language): void {
  const ext = getTestExt(language);
  const dir = resolve(root, "__tests__", "e2e");
  mkdirSync(dir, { recursive: true });
  const path = resolve(dir, `example.browser.test.${ext}`);
  const body = `import { describe, expect, it } from "@rstest/core";
import { page } from "@rstest/browser";

describe("E2E browser tests", () => {
  it("asserts element in document", async () => {
    document.body.innerHTML = \`<button id="btn">Click me</button>\`;
    await expect
      .element(page.getByRole("button", { name: "Click me" }))
      .toBeVisible();
  });
});
`;
  writeFileSync(path, body, "utf-8");
}

function mergeDevDeps(
  pkg: Record<string, unknown>,
  testKinds: TestKind[],
  installRsdoctor: boolean
): void {
  const dev = (pkg.devDependencies as Record<string, string> | undefined) ?? {};
  pkg.devDependencies = dev;

  if (testKinds.length > 0) {
    dev["@rstest/core"] = RSTEST_CORE;
  }
  if (testKinds.includes("unit")) {
    dev["@rstest/coverage-istanbul"] = RSTEST_COVERAGE;
  }
  if (testKinds.includes("e2e")) {
    dev["@rstest/browser"] = RSTEST_BROWSER;
    dev.playwright = PLAYWRIGHT;
  }
  if (installRsdoctor) {
    dev["@rsdoctor/rspack-plugin"] = RSDOCTOR_RSPACK;
  }
}

function mergeScripts(
  pkg: Record<string, unknown>,
  testKinds: TestKind[]
): void {
  const scripts = (pkg.scripts as Record<string, string> | undefined) ?? {};
  pkg.scripts = scripts;

  if (testKinds.length === 0) {
    return;
  }

  scripts.test = "addfox test";
  if (testKinds.includes("unit")) {
    scripts["test:coverage"] = "addfox test --coverage";
  }
  if (testKinds.includes("e2e")) {
    scripts.pretest = "addfox build";
  }
}

export function applyTestAndReportSetup(
  root: string,
  language: Language,
  selection: TestSetupSelection
): void {
  const { testKinds, installRsdoctor } = selection;
  if (testKinds.length === 0 && !installRsdoctor) {
    return;
  }

  const pkgPath = resolve(root, "package.json");
  const pkg = readJsonFile<Record<string, unknown>>(pkgPath);

  mergeDevDeps(pkg, testKinds, installRsdoctor);
  mergeScripts(pkg, testKinds);

  writeJsonFile(pkgPath, pkg);

  if (testKinds.length > 0) {
    const configName = language === "ts" ? "rstest.config.ts" : "rstest.config.js";
    const content = generateRstestConfig(language, testKinds);
    writeFileSync(resolve(root, configName), content, "utf-8");

    if (testKinds.includes("unit")) {
      writeUnitSample(root, language);
    }
    if (testKinds.includes("e2e")) {
      writeE2eSample(root, language);
    }
  }
}
