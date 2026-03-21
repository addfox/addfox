import { describe, expect, it } from "@rstest/core";
import { mkdtempSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { generateAddfoxConfig } from "../src/configGenerator.ts";
import { ENTRY_APP_DIRS, ENTRY_CHOICES, ENTRY_EXTRA_PERMISSIONS, ENTRY_NAMES } from "../src/entries.ts";
import { filterAppEntries, getExistingAppEntryDirs } from "../src/filterApp.ts";
import { printAddfoxLogo } from "../src/logo.ts";
import { PACKAGE_MANAGER_CHOICES, PACKAGE_MANAGER_ORDER } from "../src/packageManager.ts";
import { fetchSkillsList, getSkillsAddArgs, getSkillsChoices } from "../src/skills.ts";

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
    expect(ENTRY_CHOICES[0]?.value).toBe("__all__");
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

  it("printAddfoxLogo writes centered logo", () => {
    const logs: string[] = [];
    const oldLog = console.log;
    console.log = (msg: string) => {
      logs.push(msg);
    };

    printAddfoxLogo((s) => s);
    console.log = oldLog;

    expect(logs.length).toBe(1);
    expect(logs[0]).toContain("Addfox");
    expect(logs[0]).toContain("┌");
    expect(logs[0]).toContain("┘");
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
});
