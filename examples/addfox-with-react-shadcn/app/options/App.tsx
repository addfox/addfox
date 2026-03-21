import { useState, useEffect } from "react";
import browser from "webextension-polyfill";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
    <div className="min-h-screen p-6 bg-background">
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Options</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{status}</p>
          <Button size="sm" onClick={pingBackground}>
            Ping Background
          </Button>
          <div className="flex gap-2 items-center">
            <input
              type="text"
              placeholder="Nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="flex-1 h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
            />
            <Button size="sm" onClick={save}>
              Save
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
