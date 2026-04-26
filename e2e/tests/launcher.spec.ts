import { test, expect } from "../fixtures/launcher";
import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { findBrowserPath, isChromium, isGecko, launchChromium } from "@addfox/launcher";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLI_PATH = path.resolve(__dirname, "../../packages/launcher/dist/cli.js");

test.describe("launcher CLI", () => {
  test("shows help output", () => {
    const result = execSync(`node ${CLI_PATH} --help`, { encoding: "utf-8" });
    expect(result).toContain("addfox-launcher");
    expect(result).toContain("--extension");
    expect(result).toContain("--profile");
    expect(result).toContain("--watch");
  });

  test("exits with error for unknown browser", () => {
    try {
      execSync(`node ${CLI_PATH} unknown-browser`, {
        encoding: "utf-8",
        timeout: 5000,
      });
      expect(false).toBe(true);
    } catch (error: any) {
      expect(error.status).not.toBe(0);
      expect(error.stderr || error.stdout || "").toContain("Unknown browser");
    }
  });
});

test.describe("launcher API", () => {
  test("launchChromium is exported from subpath", () => {
    expect(typeof launchChromium).toBe("function");
  });

  test("findBrowserPath prefers custom path", () => {
    const custom = "/custom/chrome";
    const result = findBrowserPath("chrome", { chromePath: custom });
    expect(result).toBe(custom);
  });

  test("isChromium returns true for chrome/edge and false for firefox", () => {
    expect(isChromium("chrome")).toBe(true);
    expect(isChromium("edge")).toBe(true);
    expect(isChromium("firefox")).toBe(false);
    expect(isChromium("zen")).toBe(false);
  });

  test("isGecko returns true for firefox/zen and false for chrome", () => {
    expect(isGecko("firefox")).toBe(true);
    expect(isGecko("zen")).toBe(true);
    expect(isGecko("chrome")).toBe(false);
    expect(isGecko("edge")).toBe(false);
  });
});

test.describe("launcher browser launch", () => {
  test("connects via CDP and browser version is available", async ({ browser }) => {
    const version = await browser.version();
    expect(version).toBeTruthy();
    expect(version.length).toBeGreaterThan(0);
  });

  test("extension is loaded and has a valid extensionId", async ({ extensionId }) => {
    expect(extensionId).toBeTruthy();
    expect(extensionId.length).toBeGreaterThan(0);
  });

  test("extension service worker is registered", async ({ browser }) => {
    const workers = browser.contexts()[0].serviceWorkers();
    expect(workers.length).toBeGreaterThan(0);
  });

  test("can create new page and navigate", async ({ browser }) => {
    const context = browser.contexts()[0];
    const page = await context.newPage();
    await page.goto("data:text/html,<h1>Launcher Test</h1>");
    await expect(page.locator("h1")).toHaveText("Launcher Test");
    await page.close();
  });
});

test.describe("launcher gecko", () => {
  test("launchGecko starts if Firefox binary is found", async () => {
    const { launchGecko } = await import("@addfox/launcher");
    const binaryPath = findBrowserPath("firefox");
    if (!binaryPath) {
      test.skip(true, "Firefox binary not found");
      return;
    }

    const process = await launchGecko({
      target: "firefox",
      binaryPath,
      startUrl: "about:blank",
      args: ["--headless"],
    });

    expect(process.process.pid).toBeGreaterThan(0);
    expect(process.process.killed).toBe(false);

    await process.exit();
    expect(process.process.killed).toBe(true);
  });
});
