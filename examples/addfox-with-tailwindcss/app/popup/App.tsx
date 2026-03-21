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
      <h2 className="mb-2 text-base font-semibold text-slate-800">Tailwind Popup</h2>
      <p className="mb-3 text-[13px] text-slate-600">{status}</p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={pingBackground}
          className="rounded-md bg-slate-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
        >
          Ping Background
        </button>
        <button
          type="button"
          onClick={sendToContent}
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Send to Content
        </button>
      </div>
    </div>
  );
}
