import { describe, expect, it } from "@rstest/core";
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { generateAddfoxConfig } from "../src/config/generate.ts";
import { mergeScaffoldIntoAddfoxConfig } from "../src/config/merge.ts";
import { ENTRY_APP_DIRS, ENTRY_CHOICES, ENTRY_EXTRA_PERMISSIONS, ENTRY_NAMES } from "../src/scaffold/entries.ts";
import { filterAppEntries, getExistingAppEntryDirs } from "../src/template/filterEntries.ts";
import { printAddfoxLogo } from "../src/prompts/logo.ts";
import { PACKAGE_MANAGER_CHOICES, PACKAGE_MANAGER_ORDER } from "../src/prompts/packageManager.ts";
import { fetchSkillsList, getSkillsAddArgs, getSkillsChoices } from "../src/prompts/skills.ts";
import {
  ADDFOX_CLI_PACKAGE_VERSION,
  ADDFOX_UTILS_PACKAGE_VERSION,
  RSBUILD_PLUGIN_VUE_PACKAGE_VERSION,
} from "../src/config/dependencyRanges.ts";

/** Use cwd (package root); `import.meta.url` can point at rstest/cache output and break `../templates`. */
function scaffoldTemplatesDirFromTests(): string {
  return resolve(process.cwd(), "templates");
}

describe("create-addfox-app helpers", () => {
  it("generateAddfoxConfig includes framework plugins and minimal manifest", () => {
    const react = generateAddfoxConfig("react", "ts");
    const preact = generateAddfoxConfig("preact", "ts");
    const vue = generateAddfoxConfig("vue", "ts");
    const svelte = generateAddfoxConfig("svelte", "ts");
    const solid = generateAddfoxConfig("solid", "ts");
    const vanilla = generateAddfoxConfig("vanilla", "js");

    expect(react).toContain("pluginReact");
    expect(preact).toContain("pluginPreact");
    expect(vue).toContain("pluginVue");
    expect(svelte).toContain("pluginSvelte");
    expect(solid).toContain("pluginSolid");
    expect(vanilla).not.toContain("plugins: [plugin");
    expect(vanilla).toContain("manifest_version: 3");
    expect(vanilla).toContain("manifest: { chromium: manifest, firefox: { ...manifest } }");
    expect(react).toContain("icons:");
    expect(react).toContain("default_icon:");
    expect(react).toContain("icons/icon_128.png");
    expect(react).not.toContain('"storage"');
    expect(react).toContain('permissions: ["activeTab"]');
  });

  it("mergeScaffoldIntoAddfoxConfig keeps manifest and appends Less plugin", () => {
    const tpl = `import { defineConfig } from "addfox";
import { pluginReact } from "@rsbuild/plugin-react";
const manifest = { name: "X", permissions: ["activeTab"], icons: {} };
export default defineConfig({
  manifest: { chromium: manifest, firefox: { ...manifest } },
  plugins: [pluginReact()],
});`;
    const merged = mergeScaffoldIntoAddfoxConfig(tpl, "less");
    expect(merged).toContain("pluginLess");
    expect(merged).toContain("permissions: [\"activeTab\"]");
    expect(merged).toContain("pluginReact()");
  });

  it("mergeScaffoldIntoAddfoxConfig adds plugins line for vanilla template when Less", () => {
    const tpl = `import { defineConfig } from "addfox";
const manifest = { name: "X" };
export default defineConfig({
  manifest: { chromium: manifest, firefox: { ...manifest } },
});`;
    const merged = mergeScaffoldIntoAddfoxConfig(tpl, "less");
    expect(merged).toContain("pluginLess()");
    expect(merged).toContain("@rsbuild/plugin-less");
  });

  it("mergeScaffoldIntoAddfoxConfig leaves config unchanged for tailwind", () => {
    const tpl = "export default defineConfig({\n  manifest: { chromium: manifest, firefox: { ...manifest } },\n});";
    expect(mergeScaffoldIntoAddfoxConfig(tpl, "tailwindcss")).toBe(tpl);
  });

  it("generateAddfoxConfig adds Less/Sass plugins when style engine needs them", () => {
    expect(generateAddfoxConfig("react", "ts", "less")).toContain("pluginLess");
    expect(generateAddfoxConfig("react", "ts", "sass")).toContain("pluginSass");
    expect(generateAddfoxConfig("react", "ts", "tailwindcss")).not.toContain("pluginLess");
    expect(generateAddfoxConfig("react", "ts", "none")).not.toContain("pluginLess");
    expect(generateAddfoxConfig("react", "ts", "none")).not.toContain("pluginSass");
  });

  it("entries exports are consistent", () => {
    expect(ENTRY_NAMES).toEqual(ENTRY_APP_DIRS);
    expect(ENTRY_CHOICES[0]?.value).toBe("popup");
    expect(ENTRY_CHOICES).toHaveLength(ENTRY_NAMES.length);
    expect(ENTRY_EXTRA_PERMISSIONS.bookmarks).toEqual(["bookmarks"]);
    expect(ENTRY_EXTRA_PERMISSIONS.history).toEqual(["history"]);
    expect(ENTRY_EXTRA_PERMISSIONS.sidepanel).toEqual(["sidePanel"]);
  });

  it("filterAppEntries removes unselected entry dirs only", () => {
    const dest = mkdtempSync(join(tmpdir(), "addfox-filter-"));
    const app = join(dest, "app");
    mkdirSync(app, { recursive: true });
    mkdirSync(join(app, "popup"), { recursive: true });
    mkdirSync(join(app, "background"), { recursive: true });
    mkdirSync(join(app, "misc"), { recursive: true });

    filterAppEntries(dest, ["popup"]);

    expect(existsSync(join(app, "popup"))).toBe(true);
    expect(existsSync(join(app, "background"))).toBe(false);
    expect(existsSync(join(app, "misc"))).toBe(true);
  });

  it("filterAppEntries keeps all when __all__ and getExistingAppEntryDirs works", () => {
    const dest = mkdtempSync(join(tmpdir(), "addfox-filter-all-"));
    const app = join(dest, "app");
    mkdirSync(app, { recursive: true });
    mkdirSync(join(app, "popup"), { recursive: true });
    mkdirSync(join(app, "background"), { recursive: true });
    mkdirSync(join(app, "custom"), { recursive: true });

    filterAppEntries(dest, ["__all__"]);
    const dirs = getExistingAppEntryDirs(dest);

    expect(existsSync(join(app, "popup"))).toBe(true);
    expect(existsSync(join(app, "background"))).toBe(true);
    expect(dirs).toContain("popup");
    expect(dirs).toContain("background");
    expect(dirs).not.toContain("custom");
  });

  it("printAddfoxLogo writes multiline block banner", () => {
    const logs: string[] = [];
    const oldLog = console.log;
    console.log = (msg: string) => {
      logs.push(msg);
    };

    printAddfoxLogo();
    console.log = oldLog;

    expect(logs.length).toBeGreaterThanOrEqual(6);
    expect(logs.some((l) => /█|╗|═/.test(l))).toBe(true);
  });

  it("package manager exports are stable", () => {
    expect(PACKAGE_MANAGER_ORDER).toEqual(["pnpm", "npm", "yarn", "bun"]);
    expect(PACKAGE_MANAGER_CHOICES.map((i) => i.value)).toEqual(PACKAGE_MANAGER_ORDER);
  });

  it("skills helpers support fetch success and failure", async () => {
    const oldFetch = globalThis.fetch;

    globalThis.fetch = (async () => ({
      ok: true,
      json: async () => [
        { type: "dir", name: "addfox-debugging" },
        { type: "dir", name: ".internal" },
        { type: "file", name: "README.md" },
      ],
    })) as typeof fetch;
    const list = await fetchSkillsList();
    expect(list).toEqual([{ name: "addfox-debugging", value: "addfox-debugging" }]);

    globalThis.fetch = (async () => ({ ok: false, json: async () => [] })) as typeof fetch;
    expect(await fetchSkillsList()).toEqual([]);

    globalThis.fetch = (async () => {
      throw new Error("network");
    }) as typeof fetch;
    expect(await fetchSkillsList()).toEqual([]);

    globalThis.fetch = oldFetch;
  });

  it("skills arg builders handle all/specific/empty", () => {
    const choices = getSkillsChoices([{ name: "a", value: "a" }]);
    expect(choices[0]).toEqual({ title: "All", value: "__all__" });
    expect(choices[1]).toEqual({ title: "a", value: "a" });

    expect(getSkillsAddArgs(["__all__"])).toEqual(["addfox/skills"]);
    expect(getSkillsAddArgs([])).toEqual(["addfox/skills"]);
    expect(getSkillsAddArgs(["addfox-debugging", "addfox-testing"])).toEqual([
      "addfox/skills/addfox-debugging",
      "addfox/skills/addfox-testing",
    ]);
  });

  it("getExistingAppEntryDirs returns empty when app missing", () => {
    const dest = mkdtempSync(join(tmpdir(), "addfox-no-app-"));
    writeFileSync(join(dest, "README.md"), "x", "utf-8");
    expect(getExistingAppEntryDirs(dest)).toEqual([]);
  });

  it("template package.json addfox versions match scaffold constants", () => {
    const tplRoot = scaffoldTemplatesDirFromTests();
    const withUtils = JSON.parse(
      readFileSync(resolve(tplRoot, "template-vue-ts/package.json"), "utf-8"),
    ) as { dependencies: Record<string, string>; devDependencies: Record<string, string> };
    expect(withUtils.devDependencies.addfox).toBe(ADDFOX_CLI_PACKAGE_VERSION);
    expect(withUtils.dependencies["@addfox/utils"]).toBe(ADDFOX_UTILS_PACKAGE_VERSION);
    expect(withUtils.devDependencies["@addfox/utils"]).toBeUndefined();
    expect(withUtils.dependencies["@rsbuild/core"]).toBeUndefined();
    expect(withUtils.devDependencies["@rsbuild/plugin-vue"]).toBe(RSBUILD_PLUGIN_VUE_PACKAGE_VERSION);

    const vueJs = JSON.parse(
      readFileSync(resolve(tplRoot, "template-vue-js/package.json"), "utf-8"),
    ) as { devDependencies: Record<string, string> };
    expect(vueJs.devDependencies["@rsbuild/plugin-vue"]).toBe(RSBUILD_PLUGIN_VUE_PACKAGE_VERSION);

    const vanilla = JSON.parse(
      readFileSync(resolve(tplRoot, "template-vanilla-ts/package.json"), "utf-8"),
    ) as { devDependencies: Record<string, string> };
    expect(vanilla.devDependencies.addfox).toBe(ADDFOX_CLI_PACKAGE_VERSION);
  });
});
