import { createSignal } from "solid-js";
import browser from "webextension-polyfill";

export default function App() {
  const [status, setStatus] = createSignal("Idle");

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
    <div style={{ width: "280px", padding: "12px", "font-family": "system-ui, sans-serif" }}>
      <h2 style={{ margin: "0 0 8px", "font-size": "16px" }}>Solid Popup</h2>
      <p style={{ margin: "0 0 12px", "font-size": "13px", color: "#666" }}>{status()}</p>
      <button type="button" onClick={pingBackground} style={{ "margin-right": "8px", "margin-bottom": "8px", padding: "6px 12px", cursor: "pointer" }}>
        Ping Background
      </button>
      <button type="button" onClick={sendToContent} style={{ "margin-right": "8px", "margin-bottom": "8px", padding: "6px 12px", cursor: "pointer" }}>
        Send to Content
      </button>
    </div>
  );
}
