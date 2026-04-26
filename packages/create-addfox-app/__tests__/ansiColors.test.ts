import { describe, expect, it } from "@rstest/core";
import {
  black,
  red,
  green,
  yellow,
  blue,
  magenta,
  cyan,
  white,
  gray,
  lightRed,
  lightGreen,
  lightYellow,
  lightBlue,
  lightMagenta,
  lightCyan,
  lightGray,
  dim,
  trueColor,
} from "../src/lib/ansiColors.ts";

describe("ansiColors", () => {
  it("wraps text with standard ANSI color codes", () => {
    expect(red("hello")).toBe("\x1b[31mhello\x1b[0m");
    expect(green("hello")).toBe("\x1b[32mhello\x1b[0m");
    expect(yellow("hello")).toBe("\x1b[33mhello\x1b[0m");
    expect(blue("hello")).toBe("\x1b[34mhello\x1b[0m");
    expect(magenta("hello")).toBe("\x1b[35mhello\x1b[0m");
    expect(cyan("hello")).toBe("\x1b[36mhello\x1b[0m");
    expect(white("hello")).toBe("\x1b[37mhello\x1b[0m");
    expect(black("hello")).toBe("\x1b[30mhello\x1b[0m");
    expect(gray("hello")).toBe("\x1b[90mhello\x1b[0m");
    expect(lightRed("hello")).toBe("\x1b[91mhello\x1b[0m");
    expect(lightGreen("hello")).toBe("\x1b[92mhello\x1b[0m");
    expect(lightYellow("hello")).toBe("\x1b[93mhello\x1b[0m");
    expect(lightBlue("hello")).toBe("\x1b[94mhello\x1b[0m");
    expect(lightMagenta("hello")).toBe("\x1b[95mhello\x1b[0m");
    expect(lightCyan("hello")).toBe("\x1b[96mhello\x1b[0m");
    expect(lightGray("hello")).toBe("\x1b[97mhello\x1b[0m");
    expect(dim("hello")).toBe("\x1b[2mhello\x1b[0m");
  });

  it("wraps text with true color ANSI code", () => {
    const orange = trueColor(230, 138, 46);
    expect(orange("hello")).toBe("\x1b[38;2;230;138;46mhello\x1b[0m");
  });
});
