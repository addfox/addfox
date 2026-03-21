/**
 * Addfox logo for CLI: large dashed rectangle with "Addfox" text inside.
 */

type ColorFn = (s: string) => string;

const DASH_H = " - - - - - - - - - - - - - - - - - - - - - - - - - ";
const INNER_W = DASH_H.length;

export function printAddfoxLogo(colorFn: ColorFn): void {
  const c = colorFn;
  const top = "  " + c("┌" + DASH_H + "┐");
  const empty = "  " + c("│") + " ".repeat(INNER_W) + c("│");
  const text = "Addfox";
  const pad = Math.max(0, Math.floor((INNER_W - text.length) / 2));
  const textLine =
    "  " +
    c("│") +
    " ".repeat(pad) +
    c(text) +
    " ".repeat(INNER_W - pad - text.length) +
    c("│");
  const bottom = "  " + c("└" + DASH_H + "┘");
  const art = ["", top, empty, textLine, empty, bottom, ""].join("\n");
  console.log(art);
}
