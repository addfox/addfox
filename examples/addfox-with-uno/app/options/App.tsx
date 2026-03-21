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
      <h1 className="m-0 mb-4 text-xl font-semibold">Options (UnoCSS)</h1>
      <p className="m-0 mb-3 text-gray-600">{status}</p>
      <button
        type="button"
        onClick={pingBackground}
        className="mr-2 rounded bg-blue-500 px-3 py-1.5 text-white hover:bg-blue-600"
      >
        Ping Background
      </button>
      <div className="mt-3 flex items-center gap-2">
        <input
          type="text"
          placeholder="Nickname"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          className="flex-1 rounded border border-gray-300 px-2 py-1.5"
        />
        <button
          type="button"
          onClick={save}
          className="rounded bg-green-500 px-3 py-1.5 text-white hover:bg-green-600"
        >
          Save
        </button>
      </div>
    </div>
  );
}
