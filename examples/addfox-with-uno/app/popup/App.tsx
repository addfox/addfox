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
    <div className="w-[280px] p-3 font-sans">
      <h2 className="m-0 mb-2 text-base font-semibold">UnoCSS Popup</h2>
      <p className="m-0 mb-3 text-sm text-gray-600">{status}</p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={pingBackground}
          className="rounded bg-blue-500 px-3 py-1.5 text-white hover:bg-blue-600"
        >
          Ping Background
        </button>
        <button
          type="button"
          onClick={sendToContent}
          className="rounded bg-green-500 px-3 py-1.5 text-white hover:bg-green-600"
        >
          Send to Content
        </button>
      </div>
    </div>
  );
}
