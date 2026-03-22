import { existsSync } from "node:fs";
import { cp, mkdir } from "node:fs/promises";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const TEMPLATE_BASE = "templates";

/** create-addfox-app package root (parent of dist/). */
function getPackageRoot(): string {
  return resolve(dirname(fileURLToPath(import.meta.url)), "..");
}

function getBundledTemplatesDir(): string {
  return join(getPackageRoot(), TEMPLATE_BASE);
}

/** True if the bundled `templates/<name>` directory exists in this package. */
export function hasLocalTemplate(templateName: string): boolean {
  return existsSync(join(getBundledTemplatesDir(), templateName));
}

const SKIP_TEMPLATE_PATH_PARTS = new Set(["node_modules", ".git", ".pnpm"]);

/**
 * Skip dependency trees and VCS when copying a bundled template. On Windows,
 * copying pnpm's symlinked node_modules requires symlink privileges (EPERM otherwise).
 */
export function shouldCopyLocalTemplatePath(src: string): boolean {
  const normalized = src.split(/[/\\]/);
  for (const part of normalized) {
    if (SKIP_TEMPLATE_PATH_PARTS.has(part)) {
      return false;
    }
  }
  return true;
}

/**
 * Copy bundled template from node_modules/create-addfox-app/templates into destDir.
 * @throws If the template folder is missing (broken install or forgot to run build).
 */
export async function copyBundledTemplate(templateName: string, destDir: string): Promise<void> {
  const templatePath = join(getBundledTemplatesDir(), templateName);
  if (!existsSync(templatePath)) {
    throw new Error(
      `Bundled template "${templateName}" not found under create-addfox-app. Reinstall the package.`,
    );
  }
  await mkdir(destDir, { recursive: true });
  await cp(templatePath, destDir, {
    recursive: true,
    filter: (src) => shouldCopyLocalTemplatePath(src),
  });
}
