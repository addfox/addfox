import { describe, it, expect } from "@rstest/core";
import { buildGeckoArgs } from "../../src/gecko/runner";
import type { GeckoLaunchOptions } from "../../src/gecko/runner";

describe("gecko runner", () => {
  describe("buildGeckoArgs", () => {
    const baseOpts: GeckoLaunchOptions = { target: "firefox" };

    it("includes -profile", () => {
      const args = buildGeckoArgs(baseOpts, "/tmp/ff", null);
      expect(args).toContain("-profile");
      expect(args).toContain("/tmp/ff");
    });

    it("includes -no-remote and -new-instance", () => {
      const args = buildGeckoArgs(baseOpts, "/tmp/ff", null);
      expect(args).toContain("-no-remote");
      expect(args).toContain("-new-instance");
    });

    it("includes -start-debugger-server when rdpPort is set", () => {
      const args = buildGeckoArgs(baseOpts, "/tmp/ff", 1234);
      expect(args).toContain("-start-debugger-server");
      expect(args).toContain("1234");
    });

    it("does not include -start-debugger-server when rdpPort is null", () => {
      const args = buildGeckoArgs(baseOpts, "/tmp/ff", null);
      expect(args).not.toContain("-start-debugger-server");
    });

    it("adds startUrl when provided", () => {
      const args = buildGeckoArgs(
        { ...baseOpts, startUrl: "about:debugging" },
        "/tmp",
        null,
      );
      expect(args).toContain("about:debugging");
    });

    it("appends custom args", () => {
      const args = buildGeckoArgs({ ...baseOpts, args: ["-private"] }, "/tmp", null);
      expect(args).toContain("-private");
    });

    it("filters -foreground and -jsconsole on Windows", () => {
      const original = Object.getOwnPropertyDescriptor(process, "platform");
      Object.defineProperty(process, "platform", { value: "win32" });
      const args = buildGeckoArgs(
        { ...baseOpts, args: ["-foreground", "-jsconsole", "--devtools", "-private"] },
        "/tmp",
        null,
      );
      expect(args).not.toContain("-foreground");
      expect(args).not.toContain("-jsconsole");
      expect(args).not.toContain("--devtools");
      expect(args).toContain("-private");
      Object.defineProperty(process, "platform", original!);
    });

    it("does not filter -foreground on non-Windows", () => {
      const original = Object.getOwnPropertyDescriptor(process, "platform");
      Object.defineProperty(process, "platform", { value: "linux" });
      const args = buildGeckoArgs(
        { ...baseOpts, args: ["-foreground"] },
        "/tmp",
        null,
      );
      expect(args).toContain("-foreground");
      Object.defineProperty(process, "platform", original!);
    });
  });
});
