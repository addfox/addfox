/**
 * Build exo-with-react with ADDFOX_DEBUG=true (dev + monitor), wait for manifest
 * to contain open-addfox-monitor, then exit. Used by e2e to produce a dist with monitor.
 *
 * Usage: node scripts/build-with-monitor.mjs
 * Run from repo root.
 */
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const manifestPath = path.join(
  root,
  "examples",
  "exo-with-react",
  ".addfox",
  "dist",
  "manifest.json"
);

const POLL_MS = 1000;
const TIMEOUT_MS = 90000;

function hasMonitorCommand(content) {
  return String(content).includes("open-addfox-monitor");
}

async function waitForMonitorManifest() {
  const start = Date.now();
  while (Date.now() - start < TIMEOUT_MS) {
    try {
      const content = await readFile(manifestPath, "utf-8");
      if (hasMonitorCommand(content)) return true;
    } catch {
      // file not ready
    }
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
  return false;
}

async function main() {
  const child = spawn(
    "pnpm",
    ["--filter", "addfox-example-react-template", "run", "dev"],
    {
      cwd: root,
      env: { ...process.env, ADDFOX_DEBUG: "true" },
      stdio: "inherit",
      shell: true,
    }
  );

  const ok = await waitForMonitorManifest();
  child.kill("SIGTERM");
  await new Promise((resolve) => child.on("close", resolve));

  if (!ok) {
    console.error("Timeout: manifest did not contain open-addfox-monitor");
    process.exit(1);
  }
  console.log("Build with monitor ready:", manifestPath);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
