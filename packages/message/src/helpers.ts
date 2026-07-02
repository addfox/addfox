import type { Envelope } from "./types.js";

export function isEnvelope(value: unknown): value is Envelope<unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as Record<string, unknown>).__afm === true
  );
}
