/**
 * Lightweight ANSI color utilities — replaces kolorist to reduce supply-chain risk.
 * Supports standard 16-color palette and 24-bit true color.
 */

function ansiColor(code: number): (s: string) => string {
  return (s: string) => `\x1b[${code}m${s}\x1b[0m`;
}

export const black = ansiColor(30);
export const red = ansiColor(31);
export const green = ansiColor(32);
export const yellow = ansiColor(33);
export const blue = ansiColor(34);
export const magenta = ansiColor(35);
export const cyan = ansiColor(36);
export const white = ansiColor(37);
export const gray = ansiColor(90);
export const lightRed = ansiColor(91);
export const lightGreen = ansiColor(92);
export const lightYellow = ansiColor(93);
export const lightBlue = ansiColor(94);
export const lightMagenta = ansiColor(95);
export const lightCyan = ansiColor(96);
export const lightGray = ansiColor(97);
export const dim = ansiColor(2);

export function trueColor(r: number, g: number, b: number): (s: string) => string {
  return (s: string) => `\x1b[38;2;${r};${g};${b}m${s}\x1b[0m`;
}
