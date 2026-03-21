import { useState } from "react";
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

  async function sendToContent() {
    setStatus("Sending to content...");
    try {
      const res = await browser.runtime.sendMessage({
        type: "RELAY_TO_CONTENT",
        payload: { text: "Hello from popup at " + new Date().toISOString() },
      });
      setStatus(typeof res === "object" ? "Content: " + JSON.stringify(res) : String(res));
    } catch (e) {
      setStatus("Error: " + (e as Error).message);
    }
  }

  return (
    <div style={{ width: 280, padding: 12, fontFamily: "system-ui, sans-serif" }}>
      <h2 style={{ margin: "0 0 8px", fontSize: 16 }}>React Popup (entry: false)</h2>
      <p style={{ margin: "0 0 12px", fontSize: 13, color: "#666" }}>{status}</p>
      <button
        type="button"
        onClick={pingBackground}
        style={{ marginRight: 8, marginBottom: 8, padding: "6px 12px", cursor: "pointer" }}
      >
        Ping Background
      </button>
      <button
        type="button"
        onClick={sendToContent}
        style={{ marginRight: 8, marginBottom: 8, padding: "6px 12px", cursor: "pointer" }}
      >
        Send to Content
      </button>
    </div>
  );
}
