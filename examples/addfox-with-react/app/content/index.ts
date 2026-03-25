import browser from "webextension-polyfill";

let lastMessage: unknown = null;

type FromBackgroundMessage = { type: "FROM_BACKGROUND"; payload?: unknown };

function isFromBackgroundMessage(message: unknown): message is FromBackgroundMessage {
  if (!message || typeof message !== "object") return false;
  const m = message as { type?: unknown; payload?: unknown };
  return m.type === "FROM_BACKGROUND";
}

browser.runtime.onMessage.addListener(
  (message: unknown) => {
    if (isFromBackgroundMessage(message)) {
      lastMessage = message.payload;
      // lastMessage is unknown; access it only after casting for logging.
      console.log("Last message:", lastMessage);
      updateBadge();
      return Promise.resolve({ received: true, at: new Date().toISOString() });
    }
    return undefined;
  }
);

function updateBadge() {
  const el = document.getElementById("addfox-content-root");
  if (el) {
    el.textContent =
      "Last message: " +
      (lastMessage ? JSON.stringify(lastMessage) : "none");
  }
}

function inject() {
  if (document.getElementById("addfox-content-root")) return;
  const root = document.createElement("div");

  root.id = "addfox-content-root";
  root.setAttribute(
    "style",
    "position:fixed;bottom:12px;right:12px;padding:8px 12px;background:#333;color:#fff;font-size:12px;font-family:system-ui;border-radius:6px;z-index:999999;max-width:280px;"
  );
  root.textContent = "Content script loaded.";
  document.body.appendChild(root);
  updateBadge();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", inject);
} else {
  inject();
}
