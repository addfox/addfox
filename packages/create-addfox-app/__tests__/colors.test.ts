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
} from "../src/lib/colors.ts";

describe("colors", () => {
  it("wraps text with ANSI color codes", () => {
    expect(red("hello")).toBe("\x1b[31mhello\x1b[0m");
    expect(green("hello")).toBe("\x1b[32mhello\x1b[0m");
    expect(blue("hello")).toBe("\x1b[34mhello\x1b[0m");
    expect(yellow("hello")).toBe("\x1b[33mhello\x1b[0m");
    expect(cyan("hello")).toBe("\x1b[36mhello\x1b[0m");
    expect(magenta("hello")).toBe("\x1b[35mhello\x1b[0m");
    expect(gray("hello")).toBe("\x1b[90mhello\x1b[0m");
    expect(lightBlue("hello")).toBe("\x1b[94mhello\x1b[0m");
    expect(dim("hello")).toBe("\x1b[2mhello\x1b[0m");
  });

  it("supports trueColor", () => {
    const orange = trueColor(230, 138, 46);
    expect(orange("test")).toBe("\x1b[38;2;230;138;46mtest\x1b[0m");
  });

  it("covers all color exports", () => {
    expect(black("x")).toContain("x");
    expect(white("x")).toContain("x");
    expect(lightRed("x")).toContain("x");
    expect(lightGreen("x")).toContain("x");
    expect(lightYellow("x")).toContain("x");
    expect(lightMagenta("x")).toContain("x");
    expect(lightCyan("x")).toContain("x");
    expect(lightGray("x")).toContain("x");
  });
});
