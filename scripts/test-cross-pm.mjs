#!/usr/bin/env node
/**
 * Cross-PM integration tests for addfox CLI and create-addfox-app.
 * Simulates pnpm/npm/yarn/bun via npm_config_user_agent without real installs.
 * Uses local templates (no network required).
 *
 * Usage: node scripts/test-cross-pm.mjs
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, mkdirSync, rmSync, cpSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(import.meta.url), "../..");
const CLI_BIN = resolve(ROOT, "packages/cli/dist/cli.js");
const CREATE_BIN = resolve(ROOT, "packages/create-addfox-app/dist/cli.js");
const TEMPLATES_DIR = resolve(ROOT, "packages/create-addfox-app/templates");
const TMP_ROOT = join(tmpdir(), `addfox-cross-pm-${Date.now()}`);

const PM_AGENTS = {
  pnpm: { agent: "pnpm/10.0.0 node/v20.0.0", install: "pnpm install", dev: "pnpm dev" },
  npm: { agent: "npm/10.0.0 node/v20.0.0", install: "npm install", dev: "npm run dev" },
  yarn: { agent: "yarn/4.0.0 node/v20.0.0", install: "yarn", dev: "yarn dev" },
  bun: { agent: "bun/1.0.0", install: "bun install", dev: "bun dev" },
};

let passed = 0;
let failed = 0;

function run(bin, args, opts = {}) {
  const env = { ...process.env, ...opts.env };
  return execFileSync("node", [bin, ...args], {
    cwd: opts.cwd ?? ROOT,
    env,
    encoding: "utf-8",
    timeout: 30_000,
    stdio: ["pipe", "pipe", "pipe"],
  });
}

function assert(label, condition) {
  if (condition) {
    console.log(`    \x1b[32m✓\x1b[0m ${label}`);
    passed++;
  } else {
    console.log(`    \x1b[31m✗\x1b[0m ${label}`);
    failed++;
  }
}

// ─── Test Group 1: --help / --version ───

function testHelpVersion() {
  console.log("\n  --help / --version\n");

  const exHelp = run(CLI_BIN, ["--help"]);
  assert("addfox --help contains Usage + Commands", exHelp.includes("Usage:") && exHelp.includes("Commands:"));

  const exVer = run(CLI_BIN, ["--version"]).trim();
  assert(`addfox --version → "${exVer}"`, /^\d+\.\d+\.\d+/.test(exVer));

  const caHelp = run(CREATE_BIN, ["--help"]);
  assert("create-addfox-app --help contains Usage + Options", caHelp.includes("Usage:") && caHelp.includes("Options:"));

  const caVer = run(CREATE_BIN, ["--version"]).trim();
  assert(`create-addfox-app --version → "${caVer}"`, /^\d+\.\d+\.\d+/.test(caVer));
}

// ─── Test Group 2: PM detection via user-agent ───

const PM_DETECT_SCRIPT = resolve(TMP_ROOT, "_pm-detect.mjs");

function writePmDetectHelper() {
  const modPath = resolve(ROOT, "packages/pkg-manager/dist/esm/index.js");
  const fileUrl = "file:///" + modPath.replace(/\\/g, "/");
  writeFileSync(PM_DETECT_SCRIPT, `
import { detectPackageManager, getInstallCommand, getRunCommand } from "${fileUrl}";
const pm = detectPackageManager();
const install = getInstallCommand(pm);
const dev = getRunCommand(pm, "dev");
console.log(JSON.stringify({ pm, install, dev }));
`);
}

function testPmDetection() {
  console.log("\n  PM detection (user-agent)\n");

  mkdirSync(TMP_ROOT, { recursive: true });
  writePmDetectHelper();

  for (const [pm, { agent, install, dev }] of Object.entries(PM_AGENTS)) {
    try {
      const raw = execFileSync("node", [PM_DETECT_SCRIPT], {
        cwd: TMP_ROOT,
        env: { ...process.env, npm_config_user_agent: agent },
        encoding: "utf-8",
        timeout: 10_000,
      }).trim();
      const result = JSON.parse(raw);
      assert(`${pm} → "${result.install}" + "${result.dev}"`, result.install === install && result.dev === dev);
    } catch (e) {
      console.log(`    \x1b[31m✗\x1b[0m ${pm}: detection failed — ${e.message}`);
      failed++;
    }
  }
}

// ─── Test Group 3: Scaffold + structure (local templates) ───

function testScaffoldLocal() {
  console.log("\n  Scaffold + structure (local template-react-ts)\n");

  const templateSrc = join(TEMPLATES_DIR, "template-react-ts");
  if (!existsSync(templateSrc)) {
    assert("template-react-ts source exists", false);
    return;
  }

  const projDir = join(TMP_ROOT, "scaffold-react-ts");
  cpSync(templateSrc, projDir, { recursive: true });

  const pkgPath = join(projDir, "package.json");
  if (existsSync(pkgPath)) {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
    pkg.name = "scaffold-react-ts";
    writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
  }

  assert("package.json exists", existsSync(pkgPath));

  if (existsSync(pkgPath)) {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
    assert(`package.json name === "scaffold-react-ts"`, pkg.name === "scaffold-react-ts");
    assert("dependencies include addfox", !!pkg.dependencies?.addfox);
    assert("dependencies include react", !!pkg.dependencies?.react);
    assert("devDependencies include @rsbuild/plugin-react", !!pkg.devDependencies?.["@rsbuild/plugin-react"]);
  }

  const configPath = join(projDir, "addfox.config.ts");
  assert("addfox.config.ts exists", existsSync(configPath));
  if (existsSync(configPath)) {
    const config = readFileSync(configPath, "utf-8");
    assert("addfox.config.ts contains pluginReact", config.includes("pluginReact"));
    assert("addfox.config.ts contains defineConfig", config.includes("defineConfig"));
  }

  assert("tsconfig.json exists", existsSync(join(projDir, "tsconfig.json")));
  assert("app/background/index.ts", existsSync(join(projDir, "app/background/index.ts")));
  assert("app/content/index.ts", existsSync(join(projDir, "app/content/index.ts")));
  assert("app/popup/index.html", existsSync(join(projDir, "app/popup/index.html")));
  assert("app/popup/index.tsx", existsSync(join(projDir, "app/popup/index.tsx")));
  assert("app/popup/App.tsx", existsSync(join(projDir, "app/popup/App.tsx")));
  assert("app/options/index.html", existsSync(join(projDir, "app/options/index.html")));
  assert("app/sidepanel/index.html", existsSync(join(projDir, "app/sidepanel/index.html")));
  assert("public/icons/README.txt", existsSync(join(projDir, "public/icons/README.txt")));
}

// ─── Test Group 4: Non-interactive CLI flags ───

function testNonInteractiveFlags() {
  console.log("\n  Non-interactive CLI flags (--framework --language)\n");

  const helpOut = run(CREATE_BIN, ["--help"]);
  assert("--help mentions --framework", helpOut.includes("--framework"));
  assert("--help mentions --language", helpOut.includes("--language"));
}

// ─── Test Group 5: Multiple template variants ───

function testMultipleTemplates() {
  console.log("\n  Template variants\n");

  const variants = [
    { name: "template-vanilla-js", config: "addfox.config.js", hasTs: false },
    { name: "template-vue-ts", config: "addfox.config.ts", hasTs: true, configContains: "plugin-vue" },
    { name: "template-svelte-js", config: "addfox.config.js", hasTs: false, configContains: "pluginSvelte" },
    { name: "template-uno-ts", config: "addfox.config.ts", hasTs: true, extra: ["uno.config.ts", "postcss.config.mjs", "app/uno.css"] },
  ];

  for (const v of variants) {
    const src = join(TEMPLATES_DIR, v.name);
    if (!existsSync(src)) {
      assert(`${v.name} source exists`, false);
      continue;
    }
    assert(`${v.name}: ${v.config} exists`, existsSync(join(src, v.config)));

    if (v.hasTs) {
      assert(`${v.name}: tsconfig.json exists`, existsSync(join(src, "tsconfig.json")));
    }

    if (v.configContains) {
      const cfg = readFileSync(join(src, v.config), "utf-8");
      assert(`${v.name}: config contains "${v.configContains}"`, cfg.includes(v.configContains));
    }

    if (v.extra) {
      for (const f of v.extra) {
        assert(`${v.name}: ${f} exists`, existsSync(join(src, f)));
      }
    }
  }
}

// ─── Runner ───

function cleanup() {
  if (existsSync(TMP_ROOT)) rmSync(TMP_ROOT, { recursive: true, force: true });
}

function main() {
  console.log("\x1b[36m[cross-pm]\x1b[0m Running integration tests...");

  try {
    testHelpVersion();
    testPmDetection();
    testScaffoldLocal();
    testNonInteractiveFlags();
    testMultipleTemplates();
  } finally {
    cleanup();
  }

  const total = passed + failed;
  const color = failed ? "31" : "32";
  console.log(`\n  \x1b[${color}m${passed}/${total} passed\x1b[0m\n`);

  if (failed > 0) process.exit(1);
}

main();
