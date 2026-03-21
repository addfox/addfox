/**
 * Skills step: fetch addfox/skills list and run skills add via package manager.
 */

const SKILLS_REPO = "addfox/skills";
const GITHUB_API = `https://api.github.com/repos/${SKILLS_REPO}/contents`;

export interface SkillItem {
  name: string;
  value: string;
}

/** Fetch list of skill names (directories with SKILL.md) from addfox/skills. */
export async function fetchSkillsList(): Promise<SkillItem[]> {
  try {
    const res = await fetch(GITHUB_API, {
      headers: { Accept: "application/vnd.github.v3+json" },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { name?: string; type?: string }[];
    if (!Array.isArray(data)) return [];
    return data
      .filter((item) => item.type === "dir" && item.name && !item.name.startsWith("."))
      .map((item) => ({ name: item.name!, value: item.name! }));
  } catch {
    return [];
  }
}

export function getSkillsChoices(skills: SkillItem[]): { title: string; value: string }[] {
  return [
    { title: "All", value: "__all__" },
    ...skills.map((s) => ({ title: s.name, value: s.value })),
  ];
}

/** Build the skills add command args: repo or repo/skill1 repo/skill2 ... */
export function getSkillsAddArgs(selected: string[]): string[] {
  const useAll = selected.includes("__all__");
  if (useAll || selected.length === 0) return [SKILLS_REPO];
  return selected.map((s) => `${SKILLS_REPO}/${s}`);
}
