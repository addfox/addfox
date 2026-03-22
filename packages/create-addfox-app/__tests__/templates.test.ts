import { describe, expect, it } from "@rstest/core";
import {
  FRAMEWORKS,
  LANGUAGES,
  getTemplateName,
} from "../src/template/catalog.ts";

describe("template catalog", () => {
  describe("FRAMEWORKS", () => {
    it("contains all expected frameworks", () => {
      const values = FRAMEWORKS.map((f) => f.value);
      expect(values).toContain("vanilla");
      expect(values).toContain("vue");
      expect(values).toContain("react");
      expect(values).toContain("preact");
      expect(values).toContain("svelte");
      expect(values).toContain("solid");
    });
  });

  describe("LANGUAGES", () => {
    it("contains js and ts", () => {
      const values = LANGUAGES.map((l) => l.value);
      expect(values).toContain("js");
      expect(values).toContain("ts");
    });
  });

  describe("getTemplateName", () => {
    it("returns template-react-ts for react + ts", () => {
      expect(getTemplateName("react", "ts")).toBe("template-react-ts");
    });
    it("returns template-vanilla-js for vanilla + js", () => {
      expect(getTemplateName("vanilla", "js")).toBe("template-vanilla-js");
    });
  });
});
