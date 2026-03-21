import { RELOAD_MANAGER_ENTRY_NAMES as RELOAD_MANAGER_NAMES } from "@addfox/core";
import {
  RELOAD_ENTRY_NAMES as RELOAD_NAMES,
  CONTENT_ENTRY_NAMES as CONTENT_NAMES,
} from "../constants";

// ==================== Type Definitions ====================

type AssetLike = { 
  filename?: string; 
  info?: { contenthash?: string[]; chunkhash?: string[] } 
};

type ChunkLike = { 
  id?: string; 
  name?: string; 
  hash?: string 
};

type EntrypointLike = {
  name?: string;
  chunks?: ReadonlyArray<ChunkLike>;
  getFiles?: () => ReadonlyArray<string>;
};

type CompilationLike = {
  entrypoints?: ReadonlyMap<string, EntrypointLike>;
  getAsset?: (name: string) => AssetLike | void;
  getAssets?: () => ReadonlyArray<AssetLike>;
  getStats?: () => { toJson: (opts?: unknown) => unknown };
};

type StatsChunk = {
  id?: string;
  name?: string;
  names?: string[];
  modules?: StatsModule[];
};

type StatsModule = {
  name?: string;
  nameForCondition?: string;
  identifier?: string;
  chunks?: (string | null | undefined)[];
};

type StatsJson = {
  chunks?: StatsChunk[];
  modules?: StatsModule[];
};

export interface ReloadManagerDecision {
  /** True only when content or background entry output actually changed (precise). */
  shouldNotify: boolean;
  /** True when content entry changed (for toggle-extension-refresh-page). */
  contentChanged: boolean;
  /** True when background entry changed (for reload-extension). */
  backgroundChanged: boolean;
}

export type ReloadKind = "reload-extension" | "toggle-extension" | "toggle-extension-refresh-page";

// ==================== State Management ====================

interface SignatureState {
  lastReload: string | null;
  lastContent: string | null;
  lastBackground: string | null;
}

const state: SignatureState = {
  lastReload: null,
  lastContent: null,
  lastBackground: null,
};

// ==================== Stats Normalization ====================

/** Use first child stats when MultiCompiler produces MultiStats (stats.stats array). */
function getNormalizedStats(stats: unknown): unknown {
  if (!stats || typeof stats !== "object") return stats;
  const arr = (stats as { stats?: unknown[] }).stats;
  return Array.isArray(arr) && arr.length > 0 ? arr[0] : stats;
}

function getStatsJson(stats: unknown): StatsJson | null {
  try {
    const s = getNormalizedStats(stats);
    if (!s || typeof s !== "object") return null;
    const toJson = (s as { toJson?: (opts?: unknown) => unknown }).toJson;
    return typeof toJson === "function" 
      ? (toJson({ chunks: true, modules: true }) as StatsJson) 
      : null;
  } catch {
    return null;
  }
}

export function getCompilationFromStats(stats: unknown): CompilationLike | null {
  const s = getNormalizedStats(stats);
  if (!s || typeof s !== "object") return null;
  const comp = (s as { compilation?: CompilationLike }).compilation;
  return comp && typeof comp === "object" ? comp : null;
}

function getStatsFromCompilation(compilation: CompilationLike | null): StatsJson | null {
  if (!compilation || typeof compilation.getStats !== "function") return null;
  return compilation.getStats()?.toJson?.({ chunks: true, modules: true }) as StatsJson | null;
}

// ==================== Path Utilities ====================

const normalizePath = (p: string): string => p.replace(/\\/g, "/");

function createPathMatcher(filePath: string) {
  const norm = normalizePath(filePath);
  return {
    norm,
    exact: (other: string): boolean => norm === normalizePath(other),
    endsWith: (suffix: string): boolean => {
      const sn = suffix.startsWith("./") ? suffix.slice(2) : suffix;
      return norm.endsWith(sn) || normalizePath(suffix).endsWith(norm);
    },
    matches: (other: string): boolean => {
      const on = normalizePath(other);
      return norm === on || 
             (other.startsWith("./") && norm.endsWith(other.slice(2))) ||
             norm.endsWith(on) || on.endsWith(norm);
    }
  };
}

// ==================== Asset & Signature Utilities ====================

function collectAssetHashes(asset: AssetLike | undefined): string[] {
  const info = asset?.info;
  return info?.contenthash?.length 
    ? [...info.contenthash] 
    : info?.chunkhash?.length 
      ? [...info.chunkhash] 
      : [];
}

function findAsset(compilation: CompilationLike, name: string): AssetLike | undefined {
  const raw = compilation.getAsset?.(name);
  if (raw != null && typeof raw === "object") return raw;
  
  const list = compilation.getAssets?.();
  return list?.find((a) => a?.filename === name);
}

/**
 * Signature from asset contenthash/chunkhash for this entry's output files only.
 * Stable when only other entries (e.g. options, popup) change — avoids fullHash pollution.
 */
function getEntrypointSignatureFromAssets(
  compilation: CompilationLike,
  entrypoint: EntrypointLike | undefined
): string | null {
  if (!entrypoint || typeof entrypoint.getFiles !== "function") return null;
  
  try {
    const files = entrypoint.getFiles();
    if (!files?.length) return null;
    
    const parts = files.flatMap(name => collectAssetHashes(findAsset(compilation, name)));
    return parts.length > 0 ? [...parts].sort().join(",") : null;
  } catch {
    return null;
  }
}

export function getEntrypointSignature(entrypoint: EntrypointLike | undefined): string | null {
  if (!entrypoint) return null;
  
  const hashes = entrypoint.chunks
    ? entrypoint.chunks
        .map(c => c?.hash)
        .filter((h): h is string => Boolean(h))
    : [];
    
  if (hashes.length > 0) return hashes.sort().join(",");
  
  if (typeof entrypoint.getFiles === "function") {
    try {
      const files = entrypoint.getFiles();
      if (files?.length) return [...files].sort().join(",");
    } catch { /* proxy may throw */ }
  }
  
  return null;
}

function getSingleEntrySignature(
  compilation: CompilationLike,
  entryName: string
): string | null {
  if (!RELOAD_MANAGER_NAMES.has(entryName)) return null;
  if (!compilation?.entrypoints || typeof compilation.entrypoints.get !== "function") return null;
  
  const entrypoint = compilation.entrypoints.get(entryName) ?? undefined;
  return getEntrypointSignatureFromAssets(compilation, entrypoint) ?? getEntrypointSignature(entrypoint);
}

function getEntrySignatures(
  compilation: CompilationLike,
  entryNames: Set<string>
): string[] {
  if (!compilation.entrypoints || typeof compilation.entrypoints.get !== "function") return [];
  
  return Array.from(entryNames)
    .map(name => getEntrypointSignature(compilation.entrypoints!.get(name)))
    .filter((sig): sig is string => Boolean(sig));
}

export function getEntriesSignature(
  compilation: CompilationLike,
  entryNames: Set<string>
): string | null {
  const sigs = getEntrySignatures(compilation, entryNames);
  return sigs.length > 0 ? sigs.sort().join("|") : null;
}

// ==================== Entry-to-Module Mapping ====================

type ChunkIdToEntryNames = Map<string, Set<string>>;
type EntryToPaths = Map<string, Set<string>>;

function buildChunkIdToEntryNames(compilation: CompilationLike): ChunkIdToEntryNames {
  const map = new Map<string, Set<string>>();
  if (!compilation.entrypoints || typeof compilation.entrypoints.forEach !== "function") return map;
  
  try {
    compilation.entrypoints.forEach((entrypoint, entryName) => {
      const chunks = entrypoint?.chunks;
      if (!Array.isArray(chunks)) return;
      
      for (const ch of chunks) {
        const id = ch?.id != null ? String(ch.id) : undefined;
        if (!id) continue;
        
        const set = map.get(id) ?? new Set<string>();
        set.add(entryName);
        map.set(id, set);
      }
    });
  } catch {
    /* proxy may throw */
  }
  
  return map;
}

function buildChunkIdToEntryNamesFromStats(stats: StatsJson): ChunkIdToEntryNames {
  const map = new Map<string, Set<string>>();
  if (!stats.chunks) return map;
  
  for (const ch of stats.chunks) {
    if (ch.id == null) continue;
    const id = String(ch.id);
    const names = Array.isArray(ch.names) ? ch.names : ch.name != null ? [ch.name] : [];
    
    const set = map.get(id) ?? new Set<string>();
    names.forEach(n => set.add(n));
    map.set(id, set);
  }
  
  return map;
}

function addPathToEntries(
  entryToPaths: EntryToPaths,
  path: string,
  entryNames: Set<string>
): void {
  const norm = normalizePath(path);
  for (const name of entryNames) {
    const set = entryToPaths.get(name) ?? new Set<string>();
    set.add(norm);
    entryToPaths.set(name, set);
  }
}

function extractModulePath(mod: StatsModule): string | undefined {
  return mod?.nameForCondition ?? mod?.name ?? mod?.identifier;
}

function collectModuleEntryNames(
  mod: StatsModule,
  chunkIdToEntryNames: ChunkIdToEntryNames
): Set<string> {
  const entryNames = new Set<string>();
  if (!mod.chunks?.length) return entryNames;
  
  for (const id of mod.chunks) {
    if (id == null) continue;
    const names = chunkIdToEntryNames.get(String(id));
    names?.forEach(n => entryNames.add(n));
  }
  
  return entryNames;
}

function processFlatModules(
  entryToPaths: EntryToPaths,
  modules: StatsModule[],
  chunkIdToEntryNames: ChunkIdToEntryNames
): void {
  for (const mod of modules) {
    const path = extractModulePath(mod);
    if (!path) continue;
    
    const entryNames = collectModuleEntryNames(mod, chunkIdToEntryNames);
    if (entryNames.size) addPathToEntries(entryToPaths, path, entryNames);
  }
}

function processNestedModules(
  entryToPaths: EntryToPaths,
  chunks: StatsChunk[],
  chunkIdToEntryNames: ChunkIdToEntryNames
): void {
  for (const ch of chunks) {
    if (!ch.modules?.length) continue;
    
    const names = Array.isArray(ch.names) ? ch.names : ch.name != null ? [ch.name] : [];
    const entryNames = new Set(names);
    if (!entryNames.size) continue;
    
    for (const mod of ch.modules) {
      const path = extractModulePath(mod);
      if (path) addPathToEntries(entryToPaths, path, entryNames);
    }
  }
}

export function getEntryToModulePaths(stats: unknown): EntryToPaths {
  const entryToPaths = new Map<string, Set<string>>();
  const compilation = getCompilationFromStats(stats);
  const statsJson = getStatsFromCompilation(compilation) ?? getStatsJson(stats);
  
  if (!statsJson?.chunks?.length) return entryToPaths;
  
  const chunkIdToEntryNames = compilation 
    ? buildChunkIdToEntryNames(compilation)
    : buildChunkIdToEntryNamesFromStats(statsJson);
  
  if (Array.isArray(statsJson.modules) && statsJson.modules.length > 0) {
    processFlatModules(entryToPaths, statsJson.modules, chunkIdToEntryNames);
  } else {
    processNestedModules(entryToPaths, statsJson.chunks, chunkIdToEntryNames);
  }
  
  return entryToPaths;
}

// ==================== File-to-Entry Resolution ====================

/** Which entry names contain this file path (using path normalization / endsWith). */
export function getEntriesForFile(
  entryToPaths: EntryToPaths,
  filePath: string
): string[] {
  const matcher = createPathMatcher(filePath);
  const entries: string[] = [];
  
  for (const [entryName, paths] of entryToPaths) {
    for (const p of paths) {
      if (matcher.matches(p)) {
        entries.push(entryName);
        break;
      }
    }
  }
  
  return entries;
}

// ==================== Reload Manager Detection ====================

function getReloadManagerModulePaths(entryToPaths: EntryToPaths): Set<string> {
  const paths = new Set<string>();
  for (const name of RELOAD_MANAGER_NAMES) {
    entryToPaths.get(name)?.forEach(p => paths.add(p));
  }
  return paths;
}

function pathMatchesReloadManager(modifiedPath: string, reloadPaths: Set<string>): boolean {
  const matcher = createPathMatcher(modifiedPath);
  if (reloadPaths.has(matcher.norm)) return true;
  
  for (const r of reloadPaths) {
    if (matcher.matches(r)) return true;
  }
  return false;
}

function doFilesAffectReloadManager(
  modifiedFiles: ReadonlySet<string>,
  entryToPaths: EntryToPaths
): boolean {
  for (const filePath of modifiedFiles) {
    const entries = getEntriesForFile(entryToPaths, filePath);
    if (entries.some(e => RELOAD_MANAGER_NAMES.has(e))) return true;
  }
  return false;
}

function filesAffectEntry(
  modifiedFiles: ReadonlySet<string>,
  entryToPaths: EntryToPaths,
  entryName: string
): boolean {
  for (const filePath of modifiedFiles) {
    const entries = getEntriesForFile(entryToPaths, filePath);
    if (entries.includes(entryName)) return true;
  }
  return false;
}

// ==================== Decision Engine ====================

interface SignatureComparison {
  contentChanged: boolean;
  backgroundChanged: boolean;
  shouldNotify: boolean;
}

function compareSignatures(
  contentSig: string | null,
  backgroundSig: string | null
): SignatureComparison {
  const contentChanged = contentSig != null && state.lastContent != null && contentSig !== state.lastContent;
  const backgroundChanged = backgroundSig != null && state.lastBackground != null && backgroundSig !== state.lastBackground;
  const shouldNotify = contentChanged || backgroundChanged;
  
  return { contentChanged, backgroundChanged, shouldNotify };
}

function updateSignatures(contentSig: string | null, backgroundSig: string | null): void {
  if (contentSig != null) state.lastContent = contentSig;
  if (backgroundSig != null) state.lastBackground = backgroundSig;
}

/**
 * Single place to decide reloadManager WS notification and content-refresh.
 * Extension.js-style: when compiler.modifiedFiles is available, only notify if a modified file
 * belongs to content/background chunk. Otherwise fall back to signature comparison.
 */
export function getReloadManagerDecision(
  stats: unknown,
  context?: { compiler?: { modifiedFiles?: ReadonlySet<string> } }
): ReloadManagerDecision {
  const modifiedFiles = context?.compiler?.modifiedFiles;
  const entryToPaths = getEntryToModulePaths(stats);
  
  const compilation = getCompilationFromStats(stats);
  const contentSig = compilation ? getSingleEntrySignature(compilation, "content") : null;
  const backgroundSig = compilation ? getSingleEntrySignature(compilation, "background") : null;
  
  const sigComparison = compareSignatures(contentSig, backgroundSig);
  updateSignatures(contentSig, backgroundSig);
  
  const hasModifiedFiles = modifiedFiles != null && modifiedFiles.size > 0;
  const hasEntryMapping = entryToPaths.size > 0;
  
  if (hasModifiedFiles && hasEntryMapping) {
    const shouldNotify = doFilesAffectReloadManager(modifiedFiles, entryToPaths);
    return {
      shouldNotify,
      contentChanged: shouldNotify && filesAffectEntry(modifiedFiles, entryToPaths, "content"),
      backgroundChanged: shouldNotify && filesAffectEntry(modifiedFiles, entryToPaths, "background"),
    };
  }
  
  return {
    shouldNotify: sigComparison.shouldNotify,
    contentChanged: sigComparison.contentChanged,
    backgroundChanged: sigComparison.backgroundChanged,
  };
}

/**
 * Choose reload kind from decision and config.
 * - backgroundChanged → reload-extension (browser reload API).
 * - contentChanged + autoRefreshContentPage → toggle-extension-refresh-page (toggle + refresh current page).
 * - else → toggle-extension (toggle only).
 */
export function getReloadKindFromDecision(
  contentChanged: boolean,
  backgroundChanged: boolean,
  autoRefreshContentPage: boolean
): ReloadKind {
  if (backgroundChanged) return "reload-extension";
  if (contentChanged && autoRefreshContentPage) return "toggle-extension-refresh-page";
  return "toggle-extension";
}

/** True when content entry signature changed (uses same state as getReloadManagerDecision). */
export function isContentChanged(stats: unknown): boolean {
  const compilation = getCompilationFromStats(stats);
  if (!compilation) return false;
  
  const sig = getEntriesSignature(compilation, CONTENT_NAMES);
  const changed = sig !== null && state.lastContent !== null && sig !== state.lastContent;
  
  if (sig !== null) state.lastContent = sig;
  return changed;
}

// ==================== Convenience Exports ====================

export function getReloadEntriesSignature(stats: unknown): string | null {
  const compilation = getCompilationFromStats(stats);
  return compilation ? getEntriesSignature(compilation, RELOAD_NAMES) : null;
}

export function getContentEntriesSignature(stats: unknown): string | null {
  const compilation = getCompilationFromStats(stats);
  return compilation ? getEntriesSignature(compilation, CONTENT_NAMES) : null;
}
