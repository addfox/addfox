import { describe, it, expect } from "@rstest/core";
import { PassThrough } from "node:stream";
import { CDPClient, isLoadUnpackedUnsupported } from "../../src/chromium/cdp";

describe("cdp", () => {
  describe("CDPClient", () => {
    it("sends command with JSON and null terminator", async () => {
      const incoming = new PassThrough();
      const outgoing = new PassThrough();
      const client = new CDPClient(incoming, outgoing);

      let received = "";
      outgoing.on("data", (chunk) => {
        received += chunk.toString();
      });

      const sendPromise = client.sendCommand("Test.method", { foo: "bar" });

      // Read the sent message
      await new Promise<void>((resolve) => setTimeout(resolve, 50));
      expect(received).toContain('"method":"Test.method"');
      expect(received).toContain("\0");
      expect(received).toContain('"foo":"bar"');

      // Send response back
      const cmd = JSON.parse(received.replace("\0", ""));
      incoming.write(JSON.stringify({ id: cmd.id, result: { success: true } }) + "\0");

      const result = await sendPromise;
      expect(result).toEqual({ success: true });
      client.close();
    });

    it("rejects when closed", async () => {
      const incoming = new PassThrough();
      const outgoing = new PassThrough();
      const client = new CDPClient(incoming, outgoing);
      client.close();
      await expect(client.sendCommand("Test.method")).rejects.toThrow("CDP client closed");
    });
  });

  describe("isLoadUnpackedUnsupported", () => {
    it("returns true for 'not supported' message", () => {
      expect(
        isLoadUnpackedUnsupported(new Error("Extensions.loadUnpacked is not supported")),
      ).toBe(true);
    });

    it("returns true for 'not found' message", () => {
      expect(isLoadUnpackedUnsupported(new Error("method not found"))).toBe(true);
    });

    it("returns true for nested error response", () => {
      const err = new Error("'Extensions.loadUnpacked' wasn't found");
      expect(isLoadUnpackedUnsupported(err)).toBe(true);
    });

    it("returns false for other errors", () => {
      expect(isLoadUnpackedUnsupported(new Error("random error"))).toBe(false);
      expect(isLoadUnpackedUnsupported(null as any)).toBe(false);
      expect(isLoadUnpackedUnsupported(undefined as any)).toBe(false);
    });
  });
});
