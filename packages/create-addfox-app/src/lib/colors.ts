/**
 * Lightweight ANSI color helpers.
 * Replaces the `kolorist` npm package to reduce supply-chain risk.
 */

const RESET = "\x1b[0m";

function color(code: number): (s: string) => string {
  return (s: string) => `\x1b[${code}m${s}${RESET}`;
}

export const black = color(30);
export const red = color(31);
export const green = color(32);
export const yellow = color(33);
export const blue = color(34);
export const magenta = color(35);
export const cyan = color(36);
export const white = color(37);
export const gray = color(90);
export const lightRed = color(91);
export const lightGreen = color(92);
export const lightYellow = color(93);
export const lightBlue = color(94);
export const lightMagenta = color(95);
export const lightCyan = color(96);
export const lightGray = color(97);

export const dim = color(2);

/** True-color (24-bit) helper. */
export function trueColor(r: number, g: number, b: number): (s: string) => string {
  return (s: string) => `\x1b[38;2;${r};${g};${b}m${s}${RESET}`;
}
