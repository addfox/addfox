import { describe, expect, it } from "@rstest/core";

import { buildAiPromptForExtensionRuntimeError } from "../src/server/ws-server.ts";
import { buildExtensionErrorLines } from "../src/server/ws-server.ts";

describe("extension-hmr ai prompt", () => {
  it("buildAiPromptForExtensionRuntimeError returns an English prompt with required references", () => {
    const prompt = buildAiPromptForExtensionRuntimeError();
    expect(prompt.startsWith("--- BEGIN AI PROMPT ---")).toBe(true);
    expect(prompt).toContain("Addfox framework");
    expect(prompt).toContain("Addfox-based browser extension runtime error");
    expect(prompt).toContain(".addfox/llms.txt");
    expect(prompt).toContain("addfox-debugging");
    expect(prompt).toContain("--- END AI PROMPT ---");
  });

  it("buildExtensionErrorLines prefixes the same prompt for terminal AI consumption", () => {
    const lines = buildExtensionErrorLines(
      { entry: "background", type: "error", message: "boom", time: Date.now() },
      { root: "/proj", outputRoot: "/out" }
    );
    expect(lines[0]).toBe("--- BEGIN AI PROMPT ---");
    expect(lines.join("\n")).toContain(".addfox/llms.txt");
    expect(lines.join("\n")).toContain("--- Addfox extension error ---");
  });
});

