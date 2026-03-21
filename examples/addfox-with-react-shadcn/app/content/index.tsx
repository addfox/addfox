import "@/index.css";
import { createRoot } from "react-dom/client";
import browser from "webextension-polyfill";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const ROOT_ID = "addfox-react-shadcn-content-root";

function ContentApp() {
  const [lastMessage, setLastMessage] = useState<unknown>(null);

  useEffect(() => {
    const handler = (msg: { type: string; payload?: unknown }) => {
      if (msg.type === "FROM_BACKGROUND") {
        setLastMessage(msg.payload);
        return Promise.resolve({ received: true, at: new Date().toISOString() });
      }
      return undefined;
    };
    browser.runtime.onMessage.addListener(handler);
    return () => {
      browser.runtime.onMessage.removeListener(handler);
    };
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-[999999] max-w-[280px]">
      <Card className="border-2 shadow-lg">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Content Script</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground">
          {lastMessage
            ? JSON.stringify(lastMessage)
            : "Waiting for messages from popup…"}
        </CardContent>
      </Card>
    </div>
  );
}

function inject() {
  if (document.getElementById(ROOT_ID)) return;
  const root = document.createElement("div");
  root.id = ROOT_ID;
  document.body.appendChild(root);
  createRoot(root).render(<ContentApp />);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", inject);
} else {
  inject();
}
