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

  return (
    <div style={{ padding: "24px", "font-family": "system-ui, sans-serif" }}>
      <h1 style={{ margin: "0 0 16px" }}>Solid Options</h1>
      <p style={{ margin: "0 0 12px", color: "#666" }}>{status()}</p>
      <button type="button" onClick={pingBackground} style={{ "margin-right": "8px", padding: "6px 12px", cursor: "pointer" }}>
        Ping Background
      </button>
    </div>
  );
}
