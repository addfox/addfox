import { resolve } from "path";
import { readdir, rm } from "node:fs/promises";

type StatsLike = { toJson?: (opts?: unknown) => { assets?: { name?: string }[] } } & {
  hasErrors?: () => boolean;
};

export function collectHotUpdateAssetNames(statsList: unknown[]): Set<string> {
  const names = new Set<string>();
  for (const s of statsList) {
    const stats = s as StatsLike;
    if (!stats || typeof stats.toJson !== "function") continue;
    const json = stats.toJson({ all: false, assets: true }) as {
      assets?: { name?: string }[];
    };
    if (!json?.assets) continue;
    for (const asset of json.assets) {
      const name = asset?.name;
      if (typeof name === "string" && name.includes(".hot-update.")) {
        names.add(name);
      }
    }
  }
  return names;
}

export async function removeStaleHotUpdateFiles(
  distPath: string,
  keepNames: Set<string>
): Promise<void> {
  let entries;
  try {
    entries = await readdir(distPath, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = resolve(distPath, entry.name);
    if (entry.isDirectory()) {
      await removeStaleHotUpdateFiles(full, keepNames);
      continue;
    }
    if (!entry.name.includes(".hot-update.")) continue;
    const rel = full.slice(distPath.length + 1).replace(/\\/g, "/");
    if (!keepNames.has(entry.name) && !keepNames.has(rel)) {
      await rm(full, { force: true }).catch(() => {});
    }
  }
}

export async function clearOutdatedHotUpdateFiles(
  distPath: string,
  stats: unknown
): Promise<void> {
  if (!distPath) return;
  const rootStats = stats as { stats?: unknown[] } & StatsLike;
  if (rootStats?.hasErrors?.()) return;
  const list: unknown[] =
    rootStats && "stats" in rootStats && Array.isArray(rootStats.stats)
      ? rootStats.stats
      : [stats];
  const keepNames = collectHotUpdateAssetNames(list);
  if (keepNames.size === 0) return;
  await removeStaleHotUpdateFiles(distPath, keepNames);
}
