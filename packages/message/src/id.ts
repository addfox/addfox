let counter = 0;

export function createMsgId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `afm-${Date.now().toString(36)}-${++counter}`;
}
