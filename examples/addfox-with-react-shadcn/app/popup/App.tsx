import { useState } from "react";
import browser from "webextension-polyfill";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
    <div className="w-[320px] p-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Popup</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">{status}</p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={pingBackground}>
              Ping Background
            </Button>
            <Button size="sm" variant="secondary" onClick={sendToContent}>
              Send to Content
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
