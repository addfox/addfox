import type { PackageManager } from "@addfox/pkg-manager";

export const PACKAGE_MANAGER_ORDER: PackageManager[] = ["pnpm", "npm", "yarn", "bun"];

export const PACKAGE_MANAGER_CHOICES: { title: string; value: PackageManager }[] = [
  { title: "pnpm", value: "pnpm" },
  { title: "npm", value: "npm" },
  { title: "yarn", value: "yarn" },
  { title: "bun", value: "bun" },
];
