/**
 * Apply selected style engine after template copy: deps, config files, and entry imports.
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import type { Framework, Language, StyleEngine } from "../template/catalog.ts";
import { readJsonFile, writeJsonFile } from "../lib/jsonFile.ts";

const SKIP_STYLE_ENTRIES = new Set(["background", "content"]);

type StyleEngineWithDeps = Exclude<StyleEngine, "none">;

const DEPS: Record<StyleEngineWithDeps, Record<string, string>> = {
  tailwindcss: {
    tailwindcss: "^4.1.18",
    "@tailwindcss/postcss": "^4.1.18",
    postcss: "^8.4.32",
    autoprefixer: "^10.4.20",
  },
  unocss: {
    unocss: "^0.62.4",
    "@unocss/postcss": "^0.62.4",
    postcss: "^8.4.32",
  },
  less: {
    "@rsbuild/plugin-less": "^1.6.2",
    less: "^4.2.0",
  },
  sass: {
    "@rsbuild/plugin-sass": "^1.5.1",
    sass: "^1.77.0",
  },
};

function styleFileName(engine: StyleEngine): string {
  if (engine === "tailwindcss") return "global.css";
  if (engine === "unocss") return "uno.css";
  if (engine === "less") return "global.less";
  return "global.scss";
}

function listUiEntryScripts(root: string, language: Language): string[] {
  const appDir = join(root, "app");
  if (!existsSync(appDir)) return [];

  const extOrder =
    language === "ts"
      ? [".tsx", ".ts", ".vue", ".svelte"]
      : [".jsx", ".js", ".vue", ".svelte"];

  const out: string[] = [];
  for (const name of readdirSync(appDir)) {
    if (SKIP_STYLE_ENTRIES.has(name)) continue;
    const sub = join(appDir, name);
    if (!statSync(sub).isDirectory()) continue;

    for (const ext of extOrder) {
      const p = join(sub, `index${ext}`);
      if (existsSync(p)) {
        out.push(p);
        break;
      }
    }
  }
  return out;
}

function buildStyleImportLine(entryFile: string, engine: StyleEngine): string {
  const entryDir = join(entryFile, "..");
  const stylePath = join(entryDir, "..", "styles", styleFileName(engine));
  const rel = relative(entryDir, stylePath).replace(/\\/g, "/");
  return `import "${rel}";`;
}

function prependImportIfMissing(filePath: string, line: string): void {
  const raw = readFileSync(filePath, "utf8");
  if (raw.includes("/styles/global.") || raw.includes("/styles/uno.css")) {
    return;
  }
  writeFileSync(filePath, `${line}\n${raw}`, "utf8");
}

function writeTailwindFiles(root: string): void {
  const dir = join(root, "app", "styles");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "global.css"), '@import "tailwindcss";\n', "utf8");
  writeFileSync(
    join(root, "postcss.config.mjs"),
    `export default {
  plugins: {
    "@tailwindcss/postcss": {},
    autoprefixer: {},
  },
};
`,
    "utf8"
  );
}

function writeUnoFiles(root: string): void {
  const dir = join(root, "app", "styles");
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, "uno.css"),
    `@unocss preflights;
@unocss default;
`,
    "utf8"
  );
  writeFileSync(
    join(root, "postcss.config.mjs"),
    `import UnoCSS from "@unocss/postcss";

export default {
  plugins: [UnoCSS()],
};
`,
    "utf8"
  );
  writeFileSync(
    join(root, "uno.config.ts"),
    `import { defineConfig, presetUno } from "unocss";

export default defineConfig({
  content: {
    filesystem: ["./app/**/*.{html,js,ts,jsx,tsx,vue,svelte}"],
  },
  presets: [presetUno()],
});
`,
    "utf8"
  );
}

function writeLessSassFiles(root: string, engine: StyleEngine): void {
  const dir = join(root, "app", "styles");
  mkdirSync(dir, { recursive: true });
  if (engine === "less") {
    writeFileSync(join(dir, "global.less"), "body {\n  margin: 0;\n}\n", "utf8");
  } else {
    writeFileSync(join(dir, "global.scss"), "body {\n  margin: 0;\n}\n", "utf8");
  }
}

function mergeDevDependencies(pkg: Record<string, unknown>, engine: StyleEngineWithDeps): void {
  const dev = (pkg.devDependencies as Record<string, string> | undefined) ?? {};
  pkg.devDependencies = dev;
  Object.assign(dev, DEPS[engine]);
}

function writeEngineFiles(root: string, engine: StyleEngineWithDeps): void {
  if (engine === "tailwindcss") {
    writeTailwindFiles(root);
    return;
  }
  if (engine === "unocss") {
    writeUnoFiles(root);
    return;
  }
  writeLessSassFiles(root, engine);
}

export function applyStyleEngine(
  root: string,
  _framework: Framework,
  language: Language,
  engine: StyleEngine
): void {
  if (engine === "none") {
    return;
  }
  const pkgPath = join(root, "package.json");
  const pkg = readJsonFile<Record<string, unknown>>(pkgPath);
  mergeDevDependencies(pkg, engine);
  writeJsonFile(pkgPath, pkg);

  writeEngineFiles(root, engine);

  const entries = listUiEntryScripts(root, language);
  for (const file of entries) {
    prependImportIfMissing(file, buildStyleImportLine(file, engine));
  }
}
