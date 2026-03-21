import { useState, useEffect } from "react";
import browser from "webextension-polyfill";

export default function App() {
  const [status, setStatus] = useState("Idle");
  const [nickname, setNickname] = useState("");

  useEffect(() => {
    browser.storage.sync.get("nickname").then((st) => {
      setNickname((st.nickname as string) || "");
    });
  }, []);

  async function pingBackground() {
    setStatus("Sending...");
    try {
      const res = await browser.runtime.sendMessage({ type: "PING" });
      setStatus(res?.from === "background" ? "Background OK" : String(res));
    } catch (e) {
      setStatus("Error: " + (e as Error).message);
    }
  }

  function save() {
    browser.storage.sync.set({ nickname });
    setStatus("Saved.");
  }

  return (
    <div className="p-6 font-sans">
      <h1 className="mb-4 text-xl font-bold text-slate-900">Options</h1>
      <p className="mb-3 text-slate-600">{status}</p>
      <button
        type="button"
        onClick={pingBackground}
        className="mr-2 rounded-md bg-slate-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
      >
        Ping Background
      </button>
      <div className="mt-3 flex items-center gap-2">
        <input
          type="text"
          placeholder="Nickname"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          className="flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
        />
        <button
          type="button"
          onClick={save}
          className="rounded-md bg-slate-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
        >
          Save
        </button>
      </div>
    </div>
  );
}
