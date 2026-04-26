#!/usr/bin/env node
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import prompts from "prompts";
import {
  blue,
  green,
  red,
  yellow,
  dim,
  cyan,
  magenta,
  gray,
  lightBlue,
  trueColor,
} from "../lib/ansiColors.ts";

const require = createRequire(import.meta.url);
try {
  const figures = require("prompts/lib/util/figures");
  figures.radioOn = "\u25CF";
  figures.radioOff = "\u25CB";
} catch {
  /* use defaults */
}
import minimist from "../lib/minimist.ts";
import { copyBundledTemplate, hasLocalTemplate } from "../template/bundledCopy.ts";
import { runWithTemplateSpinner } from "../template/spinner.ts";
import {
  FRAMEWORKS,
  STYLE_ENGINES,
  getTemplateName,
  type Framework,
  type Language,
  type StyleEngine,
} from "../template/catalog.ts";
import { PACKAGE_MANAGER_CHOICES } from "../prompts/packageManager.ts";
import { ENTRY_CHOICES } from "../scaffold/entries.ts";
import { filterAppEntries, getExistingAppEntryDirs } from "../template/filterEntries.ts";
import { generateAddfoxConfig } from "../config/generate.ts";
import { mergeScaffoldIntoAddfoxConfig } from "../config/merge.ts";
import type { TestKind } from "../scaffold/test.ts";
import { applyTestAndReportSetup } from "../scaffold/test.ts";
import { readJsonFile, writeJsonFile } from "../lib/jsonFile.ts";
import { printAddfoxLogo } from "../prompts/logo.ts";
import type { PackageManager } from "@addfox/pkg-manager";
import {
  detectPackageManager,
  getInstallCommand,
  getRunCommand,
  getExecCommand,
} from "@addfox/pkg-manager";
import { applyStyleEngine } from "../scaffold/style.ts";

const SKILLS_REPO = "addfox/skills";

/** Replaces prompts default "Return to submit" on select prompts. */
const PROMPT_SELECT_HINT = "- Use arrow-keys. Enter to confirm";

/**
 * Same structure as prompts multiselect defaults, but "Enter to confirm"
 * instead of "enter/return: Complete answer".
 */
function multiselectInstructions(showToggleAll: boolean): string {
  return (
    "\nInstructions:\n" +
    "    ↑/↓: Highlight option\n" +
    "    ←/→/[space]: Toggle selection\n" +
    (showToggleAll ? "    a: Toggle all\n" : "") +
    "    Enter to confirm"
  );
}

const orange = trueColor(230, 138, 46);

function getFrameworkChoicesColored(): { title: string; value: Framework }[] {
  const colors: Record<Framework, (s: string) => string> = {
    vanilla: gray,
    vue: green,
    react: cyan,
    preact: yellow,
    svelte: red,
    solid: lightBlue,
  };
  return FRAMEWORKS.map((f) => ({ ...f, title: colors[f.value](f.title) }));
}

function getLanguageChoicesColored(): { title: string; value: Language }[] {
  return [
    { title: cyan("TypeScript"), value: "ts" },
    { title: yellow("JavaScript"), value: "js" },
  ];
}

function getPackageManagerChoicesColored(): { title: string; value: PackageManager }[] {
  const colors: Record<PackageManager, (s: string) => string> = {
    pnpm: orange,
    npm: red,
    yarn: blue,
    bun: green,
  };
  return PACKAGE_MANAGER_CHOICES.map((c) => ({ ...c, title: colors[c.value](c.title) }));
}

function getStyleEngineChoicesColored(): { title: string; value: StyleEngine }[] {
  const colors: Record<StyleEngine, (s: string) => string> = {
    none: dim,
    tailwindcss: cyan,
    unocss: green,
    less: yellow,
    sass: magenta,
  };
  return STYLE_ENGINES.map((c) => ({ ...c, title: colors[c.value](c.title) }));
}

function getVersion(): string {
  try {
    const pkgPath = resolve(dirname(fileURLToPath(import.meta.url)), "..", "package.json");
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as { version?: string };
    return pkg.version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}

function printHelp(): void {
  const version = getVersion();
  console.log(`
  create-addfox-app v${version}

  Create a new addfox extension project

  Usage:
    create-addfox-app [project-name] [options]

  Options:
    --framework <name>   Skip prompt: vanilla | vue | react | preact | svelte | solid
    --language  <lang>   Skip prompt: js | ts
    --help               Show this help message
    --version            Show version number

  Steps: 1) framework  2) style engine  3) language  4) package manager  5) entries
          6) test setup (optional unit / e2e)  7) Rsdoctor (optional)
          8) install skills

  Options (non-interactive / skip prompts when used with --framework + --language):
    --style <name>       none | tailwindcss | unocss | less | sass (default: tailwindcss)
    --unit               Add rstest unit setup (with --framework and --language)
    --e2e                Add rstest E2E (Playwright browser) setup
    --rsdoctor           Add @rsdoctor/rspack-plugin (use addfox dev/build --report)
`);
}

const VALID_STYLE_ENGINES = new Set<StyleEngine>([
  "none",
  "tailwindcss",
  "unocss",
  "less",
  "sass",
]);

function parseStyleEngineArg(raw: unknown): StyleEngine {
  const s = typeof raw === "string" ? raw.toLowerCase() : "";
  if (VALID_STYLE_ENGINES.has(s as StyleEngine)) {
    return s as StyleEngine;
  }
  return "tailwindcss";
}

async function confirmOverwrite(dir: string): Promise<boolean> {
  const { action } = await prompts({
    type: "select",
    name: "action",
    message: `Directory "${dir}" already exists. What would you like to do?`,
    choices: [
      { title: "Cancel", value: "cancel" },
      { title: "Overwrite (replace contents)", value: "overwrite" },
    ],
    initial: 0,
    hint: PROMPT_SELECT_HINT,
  });
  if (action === undefined) {
    return false;
  }
  return action === "overwrite";
}

async function promptOptions(): Promise<{
  framework: Framework;
  styleEngine: StyleEngine;
  language: Language;
  packageManager: PackageManager;
  entries: string[];
} | null> {
  const res = await prompts([
    {
      type: "select",
      name: "framework",
      message: "Select a framework",
      choices: getFrameworkChoicesColored(),
      hint: PROMPT_SELECT_HINT,
    },
    {
      type: "select",
      name: "styleEngine",
      message: "Select a style engine",
      choices: getStyleEngineChoicesColored(),
      hint: PROMPT_SELECT_HINT,
    },
    {
      type: "select",
      name: "language",
      message: "Select a language",
      choices: getLanguageChoicesColored(),
      hint: PROMPT_SELECT_HINT,
    },
    {
      type: "select",
      name: "packageManager",
      message: "Select package manager",
      choices: getPackageManagerChoicesColored(),
      hint: PROMPT_SELECT_HINT,
    },
    {
      type: "multiselect",
      name: "entries",
      message: "Select extension entries",
      choices: ENTRY_CHOICES,
      min: 1,
      hint: "Space to toggle (○ unselected, ● selected)",
      instructions: multiselectInstructions(true),
    },
  ]);
  if (
    !res.framework ||
    !res.styleEngine ||
    !res.language ||
    !res.packageManager ||
    !res.entries?.length
  )
    return null;
  return {
    framework: res.framework as Framework,
    styleEngine: res.styleEngine as StyleEngine,
    language: res.language as Language,
    packageManager: res.packageManager as PackageManager,
    entries: res.entries as string[],
  };
}

const TEST_KIND_CHOICES: { title: string; value: TestKind }[] = [
  { title: "Unit — rstest (Node)", value: "unit" },
  { title: "E2E — rstest + Playwright (browser)", value: "e2e" },
];

async function promptTestAndReport(): Promise<{
  testKinds: TestKind[];
  installRsdoctor: boolean;
} | null> {
  const testRes = await prompts({
    type: "multiselect",
    name: "testKinds",
    message: "Initialize test config? (optional)",
    choices: TEST_KIND_CHOICES,
    min: 0,
    hint: "Space toggles — leave empty to skip",
    instructions: multiselectInstructions(true),
  });
  if (testRes.testKinds === undefined) {
    return null;
  }

  const docRes = await prompts({
    type: "select",
    name: "installRsdoctor",
    message:
      "Install Rsdoctor (@rsdoctor/rspack-plugin) for bundle analysis? After install, use addfox dev or addfox build with --report.",
    choices: [
      { title: "Yes", value: true },
      { title: "No", value: false },
    ],
    initial: 0,
    hint: PROMPT_SELECT_HINT,
  });
  if (docRes.installRsdoctor === undefined) {
    return null;
  }

  return {
    testKinds: (testRes.testKinds as TestKind[]) ?? [],
    installRsdoctor: Boolean(docRes.installRsdoctor),
  };
}

function resolveTestSelectionFromArgv(argv: Record<string, unknown>): {
  testKinds: TestKind[];
  installRsdoctor: boolean;
} {
  const kinds: TestKind[] = [];
  if (argv.unit) {
    kinds.push("unit");
  }
  if (argv.e2e) {
    kinds.push("e2e");
  }
  return {
    testKinds: kinds,
    installRsdoctor: Boolean(argv.rsdoctor),
  };
}

function updatePackageName(destDir: string, projectName: string): void {
  const pkgPath = resolve(destDir, "package.json");
  if (!existsSync(pkgPath)) return;

  const pkg = readJsonFile<Record<string, unknown>>(pkgPath);
  pkg.name = projectName.replace(/\s+/g, "-").toLowerCase();
  writeJsonFile(pkgPath, pkg);
}

async function main(): Promise<void> {
  const argv = minimist(process.argv.slice(2));

  if (argv.help || argv.h) {
    printHelp();
    return;
  }

  if (argv.version || argv.v) {
    console.log(getVersion());
    return;
  }

  const targetDir: string = argv._[0] ?? "my-extension";
  const cliFramework = argv.framework as Framework | undefined;
  const cliLanguage = argv.language as Language | undefined;

  printAddfoxLogo();
  console.log(blue("\n  Create Addfox App\n"));

  const root = resolve(process.cwd(), targetDir);

  if (existsSync(root)) {
    const confirmed = await confirmOverwrite(targetDir);
    if (!confirmed) process.exit(0);
    rmSync(root, { recursive: true, force: true });
  }

  const options =
    cliFramework && cliLanguage
      ? {
          framework: cliFramework,
          styleEngine: parseStyleEngineArg(argv.style),
          language: cliLanguage,
          packageManager: detectPackageManager(),
          entries: ["__all__"],
        }
      : await promptOptions();
  if (!options) process.exit(0);

  const testSelection = cliFramework && cliLanguage
    ? resolveTestSelectionFromArgv(argv)
    : await promptTestAndReport();
  if (!testSelection) process.exit(0);

  const pm = options.packageManager;

  const templateName = getTemplateName(options.framework, options.language);

  const templateReady = hasLocalTemplate(templateName);
  const templateLabel = "Copying template...";

  /** Copy can finish in one tick; keep spinner visible briefly. */
  const TEMPLATE_SPINNER_MIN_MS = 800;

  try {
    await runWithTemplateSpinner(
      templateLabel,
      async () => {
        await new Promise<void>((resolveSpinner) => {
          setImmediate(resolveSpinner);
        });
        await copyBundledTemplate(templateName, root);
      },
      templateReady ? { minVisibleMs: TEMPLATE_SPINNER_MIN_MS } : undefined,
    );
  } catch (err) {
    console.error(red(`\n  Failed to copy template: ${(err as Error).message}\n`));
    process.exit(1);
  }

  const useAllEntries = options.entries.includes("__all__");
  const existingDirs = getExistingAppEntryDirs(root);
  const effectiveEntries = useAllEntries
    ? ["__all__"]
    : options.entries.filter((e) => e !== "__all__" && existingDirs.includes(e));

  if (!useAllEntries && effectiveEntries.length > 0) {
    filterAppEntries(root, effectiveEntries);
  }

  const configExt = options.language === "ts" ? "ts" : "js";
  const configPath = resolve(root, `addfox.config.${configExt}`);
  let configContent: string;
  if (existsSync(configPath)) {
    const existing = readFileSync(configPath, "utf-8");
    if (existing.trim().length > 0 && existing.includes("defineConfig")) {
      configContent = mergeScaffoldIntoAddfoxConfig(existing, options.styleEngine);
    } else {
      configContent = generateAddfoxConfig(
        options.framework,
        options.language,
        options.styleEngine,
      );
    }
  } else {
    configContent = generateAddfoxConfig(
      options.framework,
      options.language,
      options.styleEngine,
    );
  }
  writeFileSync(configPath, configContent, "utf-8");

  updatePackageName(root, targetDir);

  applyStyleEngine(root, options.framework, options.language, options.styleEngine);

  applyTestAndReportSetup(root, options.language, testSelection);

  const installCmd = getInstallCommand(pm);
  const devCmd = getRunCommand(pm, "dev");

  const { installSkills } = await prompts({
    type: "select",
    name: "installSkills",
    message: "Install addfox skills?",
    choices: [
      { title: "Yes", value: true },
      { title: "No", value: false },
    ],
    initial: 0,
    hint: PROMPT_SELECT_HINT,
  });

  if (installSkills === true) {
    const execCmd = getExecCommand(pm);
    const fullCmd = `${execCmd} skills add ${SKILLS_REPO}`;
    console.log(yellow("\n  Running: " + fullCmd + "\n"));
    try {
      execSync(fullCmd, { cwd: root, stdio: "inherit" });
    } catch {
      console.log(dim("  (Skills install skipped or failed; you can run it later.)\n"));
    }
  }

  console.log(green("\n  ✓ Project created successfully\n"));
  console.log(dim("  Next steps:\n"));
  console.log(`  cd ${targetDir}`);
  console.log(`  ${installCmd}`);
  console.log(`  ${devCmd}\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
