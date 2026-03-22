/**
 * CLI banner: FIGlet-style block letters (same family as Vercel skills CLI).
 *
 * Uses **256-color** ANSI (`\x1b[38;5;Nm`) for the orange→pink gradient, not 24-bit
 * truecolor (`38;2;r;g;b`). Apple Terminal + zsh often mishandle or strip truecolor;
 * Vercel `skills` uses per-line 256-color grays for the same reason.
 *
 * @see https://github.com/vercel-labs/skills/blob/main/src/cli.ts (showLogo / GRAYS)
 */

const RESET = "\x1b[0m";

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

/** xterm 256 palette: orange → magenta/pink (horizontal gradient). */
const GRADIENT_START_256 = 208;
const GRADIENT_END_256 = 213;

/** https://no-color.org/ — any non-empty `NO_COLOR` disables ANSI color. */
function shouldEmitAnsiColor(): boolean {
  return !process.env.NO_COLOR;
}

function ansi256Fg(code: number): string {
  return `\x1b[38;5;${code}m`;
}

function colorizeLineAnsi256(line: string): string {
  const len = line.length;
  if (len === 0) {
    return "";
  }
  let out = "";
  for (let i = 0; i < len; i++) {
    const ch = line[i] ?? "";
    if (ch === " ") {
      out += ch;
      continue;
    }
    const t = len <= 1 ? 0 : i / (len - 1);
    const code = Math.round(GRADIENT_START_256 + t * (GRADIENT_END_256 - GRADIENT_START_256));
    out += ansi256Fg(code) + ch;
  }
  return out + RESET;
}

function printPlainLogo(): void {
  console.log("");
  for (const line of LOGO_LINES) {
    console.log(line);
  }
  console.log("");
}

export function printAddfoxLogo(): void {
  if (!shouldEmitAnsiColor()) {
    printPlainLogo();
    return;
  }
  console.log("");
  for (const line of LOGO_LINES) {
    console.log(colorizeLineAnsi256(line));
  }
  console.log("");
}
