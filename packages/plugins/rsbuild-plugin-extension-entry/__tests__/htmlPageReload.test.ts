import { describe, expect, it } from "@rstest/core";
import { resolve } from "path";
import type { EntryInfo } from "@addfox/core";
import {
  buildHtmlTemplateReloadPathMap,
  collectHtmlReloadPaths,
  getModifiedFilesFromCompiler,
  normalizePathForCompare,
  notifyHtmlTemplateFullReload,
  statsHasErrors,
  toFullReloadHtmlPath,
} from "../src/htmlPageReload";

describe("htmlPageReload", () => {
  const popupHtml = resolve("/app/src/popup/index.html");
  const optionsHtml = resolve("/app/src/options/index.html");

  it("toFullReloadHtmlPath prefixes slash when missing", () => {
    expect(toFullReloadHtmlPath("popup/index.html")).toBe("/popup/index.html");
    expect(toFullReloadHtmlPath("/options/index.html")).toBe("/options/index.html");
  });

  it("buildHtmlTemplateReloadPathMap maps template paths to output html paths", () => {
    const entries: EntryInfo[] = [
      { name: "popup", scriptPath: resolve("/app/src/popup/main.ts"), htmlPath: popupHtml },
      { name: "options", scriptPath: optionsHtml, htmlPath: optionsHtml, htmlOnly: true },
      { name: "background", scriptPath: resolve("/app/src/background/index.ts") },
    ];
    const outputMap = {
      html: {
        popup: "popup/index.html",
        options: "options/index.html",
      },
      js: {},
      css: {},
    };

    const map = buildHtmlTemplateReloadPathMap(entries, outputMap);
    expect(map.get(normalizePathForCompare(popupHtml))).toBe("/popup/index.html");
    expect(map.get(normalizePathForCompare(optionsHtml))).toBe("/options/index.html");
    expect(map.size).toBe(2);
  });

  it("collectHtmlReloadPaths ignores non-template html and .addfox paths", () => {
    const templateMap = new Map([
      [normalizePathForCompare(popupHtml), "/popup/index.html"],
    ]);
    const paths = collectHtmlReloadPaths(
      new Set([popupHtml, resolve("/app/.addfox/extension/popup/index.html"), "/app/readme.md"]),
      templateMap
    );
    expect(paths).toEqual(["/popup/index.html"]);
  });

  it("notifyHtmlTemplateFullReload calls sockWrite per changed template", () => {
    const templateMap = new Map([
      [normalizePathForCompare(popupHtml), "/popup/index.html"],
      [normalizePathForCompare(optionsHtml), "/options/index.html"],
    ]);
    const calls: Array<{ type: string; data?: { path?: string } }> = [];
    const sockWrite = (type: "full-reload", data?: { path?: string }) => {
      calls.push({ type, data });
    };

    notifyHtmlTemplateFullReload(new Set([popupHtml, optionsHtml]), templateMap, sockWrite);
    expect(calls).toEqual([
      { type: "full-reload", data: { path: "/popup/index.html" } },
      { type: "full-reload", data: { path: "/options/index.html" } },
    ]);
  });

  it("getModifiedFilesFromCompiler reads watcher mtimes from Map", () => {
    const compiler = {
      watchFileSystem: {
        watcher: {
          mtimes: new Map([[popupHtml, 1]]),
        },
      },
    };
    expect(getModifiedFilesFromCompiler(compiler as never)).toEqual(new Set([popupHtml]));
  });

  it("getModifiedFilesFromCompiler falls back to watchFileSystem watcher mtimes", () => {
    const compiler = {
      watchFileSystem: {
        watcher: {
          mtimes: { [popupHtml]: 1 },
        },
      },
    };
    expect(getModifiedFilesFromCompiler(compiler as never)).toEqual(new Set([popupHtml]));
  });

  it("getModifiedFilesFromCompiler prefers compiler.modifiedFiles", () => {
    const compiler = {
      modifiedFiles: new Set([popupHtml]),
    };
    expect(getModifiedFilesFromCompiler(compiler as never)).toEqual(new Set([popupHtml]));
  });

  it("statsHasErrors returns true when stats is missing or has errors", () => {
    expect(statsHasErrors(null)).toBe(true);
    expect(statsHasErrors({ hasErrors: () => true })).toBe(true);
    expect(statsHasErrors({ hasErrors: () => false })).toBe(false);
  });
});
