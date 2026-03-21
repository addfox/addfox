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
    <div style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ margin: "0 0 16px" }}>Options (entry: false)</h1>
      <p style={{ margin: "0 0 12px", color: "#666" }}>{status}</p>
      <button
        type="button"
        onClick={pingBackground}
        style={{ marginRight: 8, padding: "6px 12px", cursor: "pointer" }}
      >
        Ping Background
      </button>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 12 }}>
        <input
          type="text"
          placeholder="Nickname"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          style={{ flex: 1, padding: 6 }}
        />
        <button
          type="button"
          onClick={save}
          style={{ padding: "6px 12px", cursor: "pointer" }}
        >
          Save
        </button>
      </div>
    </div>
  );
}
