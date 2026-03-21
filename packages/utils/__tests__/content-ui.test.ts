import { describe, expect, it } from "@rstest/core";
import {
  defineContentUI,
  defineShadowContentUI,
  defineIframeContentUI,
} from "../src/content-ui";

describe("content-ui", () => {
  describe("define*ContentUI", () => {
    it("returns mount function for native UI", () => {
      const mount = defineContentUI({ tag: "div", target: "body" });
      expect(typeof mount).toBe("function");
    });

    it("returns mount function for shadow UI", () => {
      const mount = defineShadowContentUI({
        name: "my-content-ui",
        target: "#root",
        injectMode: "prepend",
      });
      expect(typeof mount).toBe("function");
    });

    it("returns mount function for iframe UI", () => {
      const mount = defineIframeContentUI({ target: "body" });
      expect(typeof mount).toBe("function");
    });

    it("accepts common attrs on define", () => {
      const mount = defineContentUI({
        tag: "div",
        target: "body",
        attr: { id: "app", class: "container" },
      });
      expect(typeof mount).toBe("function");
    });
  });
});
