/**
 * CLI banner: FIGlet-style block letters (same family as Vercel skills CLI),
 * with a left→right orange → pink truecolor gradient on ink.
 *
 * @see https://github.com/vercel-labs/skills/blob/main/src/cli.ts (LOGO_LINES / showLogo)
 */

const RESET = "\x1b[0m";

/** Orange → pink (RGB), applied horizontally across each line. */
const ORANGE: [number, number, number] = [255, 118, 38];
const PINK: [number, number, number] = [255, 92, 186];

/**
 * `figlet addfox -f "ANSI Shadow"` (fixed width, no trailing blank row).
 * Same box-drawing / block style as the Vercel `skills` logo.
 */
const LOGO_LINES = [
  " █████╗ ██████╗ ██████╗ ███████╗ ██████╗ ██╗  ██╗",
  "██╔══██╗██╔══██╗██╔══██╗██╔════╝██╔═══██╗╚██╗██╔╝",
  "███████║██║  ██║██║  ██║█████╗  ██║   ██║ ╚███╔╝ ",
  "██╔══██║██║  ██║██║  ██║██╔══╝  ██║   ██║ ██╔██╗ ",
  "██║  ██║██████╔╝██████╔╝██║     ╚██████╔╝██╔╝ ██╗",
  "╚═╝  ╚═╝╚═════╝ ╚═════╝ ╚═╝      ╚═════╝ ╚═╝  ╚═╝",
];

function lerpChannel(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t);
}

function rgbFg(r: number, g: number, b: number): string {
  return `\x1b[38;2;${r};${g};${b}m`;
}

function colorizeLine(line: string): string {
  const len = line.length;
  if (len === 0) return "";

  let out = "";
  for (let i = 0; i < len; i++) {
    const ch = line[i] ?? "";
    if (ch === " ") {
      out += ch;
      continue;
    }
    const t = len <= 1 ? 0 : i / (len - 1);
    const r = lerpChannel(ORANGE[0], PINK[0], t);
    const g = lerpChannel(ORANGE[1], PINK[1], t);
    const b = lerpChannel(ORANGE[2], PINK[2], t);
    out += rgbFg(r, g, b) + ch;
  }
  return out + RESET;
}

export function printAddfoxLogo(): void {
  console.log("");
  for (const line of LOGO_LINES) {
    console.log(colorizeLine(line));
  }
  console.log("");
}
