import browser from "webextension-polyfill";

let lastMessage: unknown = null;

browser.runtime.onMessage.addListener((msg: { type: string; payload?: unknown }) => {
  if (msg.type === "FROM_BACKGROUND") {
    lastMessage = msg.payload;
    updateBadge();
    return Promise.resolve({ received: true, at: new Date().toISOString() });
  }
  return undefined;
});

function updateBadge() {
  const el = document.getElementById("addfox-content-root");
  if (el) {
    el.textContent =
      "Last message: " + (lastMessage ? JSON.stringify(lastMessage) : "none");
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
  root.textContent = "Content script (entry: false).";
  document.body.appendChild(root);
  updateBadge();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", inject);
} else {
  inject();
}
