/**
 * E2E Tests for CLI commands
 * 
 * These tests verify CLI commands work correctly by spawning
 * the CLI process and checking outputs.
 */

import { test, expect } from "@playwright/test";
import { execSync, spawn } from "child_process";
import * as path from "path";
import * as fs from "fs";
import { tmpdir } from "os";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLI_PATH = path.resolve(__dirname, "../../packages/cli/dist/cli.js");
const CREATE_APP_PATH = path.resolve(__dirname, "../../packages/create-addfox-app/dist/cli.js");

test.describe("CLI Commands", () => {
  test.describe("addfox build", () => {
    test("should show help", async () => {
      const result = execSync(`node ${CLI_PATH} --help`, {
        encoding: "utf-8",
      });
      
      expect(result).toContain("addfox");
      expect(result).toContain("build");
      expect(result).toContain("dev");
    });

    test("should handle invalid command gracefully", async () => {
      try {
        execSync(`node ${CLI_PATH} invalid-command`, {
          encoding: "utf-8",
          timeout: 10000,
        });
        expect(false).toBe(true); // Should not reach here
      } catch (error: any) {
        // Command should fail with non-zero exit code
        expect(error.status).not.toBe(0);
      }
    });
  });

  test.describe("create-addfox-app", () => {
    test("should show help", async () => {
      const result = execSync(`node ${CREATE_APP_PATH} --help`, {
        encoding: "utf-8",
      });
      
      expect(result).toContain("create-addfox-app");
      expect(result).toContain("framework");
    });
  });
});
