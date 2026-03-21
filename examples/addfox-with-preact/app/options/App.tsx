import { useState } from "preact/hooks";
import browser from "webextension-polyfill";

export default function App() {
  const [status, setStatus] = useState("Idle");

  async function pingBackground() {
    setStatus("Sending...");
    try {
      const res = await browser.runtime.sendMessage({ type: "PING" });
      setStatus(res?.from === "background" ? "Background OK" : String(res));
    } catch (e) {
      setStatus("Error: " + (e as Error).message);
    }
  }

  return (
    <div style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ margin: "0 0 16px" }}>Preact Options</h1>
      <p style={{ margin: "0 0 12px", color: "#666" }}>{status}</p>
      <button type="button" onClick={pingBackground} style={{ marginRight: 8, padding: "6px 12px", cursor: "pointer" }}>
        Ping Background
      </button>
    </div>
  );
}
