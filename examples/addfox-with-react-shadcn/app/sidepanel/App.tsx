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

  return (
    <div className="p-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Side Panel</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">{status}</p>
          <Button size="sm" onClick={pingBackground}>
            Ping Background
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
