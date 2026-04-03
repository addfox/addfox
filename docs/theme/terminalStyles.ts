export const termLine = {
  prompt: "text-[var(--addfox-term-prompt)]",
  addfox: "text-[var(--addfox-term-addfox)]",
  rsbuild: "text-[var(--addfox-term-purple)]",
  value: "text-[var(--addfox-term-value)]",
  done: "text-[var(--addfox-term-done)]",
  purple: "text-[var(--addfox-term-purple)]",
  time: "text-[var(--addfox-term-time)]",
  cyan: "text-[var(--addfox-term-cyan)]",
} as const;

export const termTable =
  "table my-2 text-[0.8125rem] border-collapse font-mono border border-dashed border-[var(--addfox-term-border)] text-[var(--addfox-term-value)] [&_th]:px-3 [&_th]:py-1 [&_th]:text-left [&_th]:border [&_th]:border-dashed [&_th]:border-[var(--addfox-term-border)] [&_th]:text-[var(--addfox-term-purple)] [&_th]:font-semibold [&_th]:bg-black/15 [&_td]:px-3 [&_td]:py-1 [&_td]:text-left [&_td]:border [&_td]:border-dashed [&_td]:border-[var(--addfox-term-border)] [&_tbody_tr:hover_td]:bg-black/10";

export const termBody = "p-3 px-4 font-mono text-[0.75rem] leading-[1.4] whitespace-pre-wrap break-all";

export const termBox =
  "addfox-term-glass border border-[var(--addfox-term-border)] rounded-lg overflow-hidden shadow-[var(--addfox-term-shadow)]";
