/**
 * Extension entry types supported by create-addfox-app.
 * Matches addfox MANIFEST_ENTRY_KEYS; app/ subdir names align with these.
 */
export const ENTRY_NAMES = [
  "popup",
  "options",
  "background",
  "content",
  "devtools",
  "sidepanel",
  "sandbox",
  "newtab",
  "bookmarks",
  "history",
  "offscreen",
] as const;

export type EntryName = (typeof ENTRY_NAMES)[number];

/** app/ directory name for each entry (same as entry name) */
export const ENTRY_APP_DIRS: readonly EntryName[] = ENTRY_NAMES;

export const ENTRY_CHOICES: { title: string; value: string }[] = ENTRY_NAMES.map((name) => ({
  title: name,
  value: name,
}));

/** Entries that require extra permissions when added to manifest */
export const ENTRY_EXTRA_PERMISSIONS: Record<string, string[]> = {
  bookmarks: ["bookmarks"],
  history: ["history"],
  sidepanel: ["sidePanel"],
};
