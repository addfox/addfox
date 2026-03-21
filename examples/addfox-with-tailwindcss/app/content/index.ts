import "./index.css";
import browser from "webextension-polyfill";

let lastMessage: unknown = null;

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
  root.className =
    "fixed bottom-3 right-3 z-[999999] max-w-[280px] rounded-lg border border-slate-200 bg-slate-800 px-3 py-2 font-sans text-xs text-white shadow-lg";
  root.textContent = "Content script loaded.";
  document.body.appendChild(root);
  updateBadge();
}

browser.runtime.onMessage.addListener(
  (msg: { type: string; payload?: unknown }) => {
    if (msg.type === "FROM_BACKGROUND") {
      lastMessage = msg.payload;
      updateBadge();
      return Promise.resolve({ received: true, at: new Date().toISOString() });
    }
    return undefined;
  }
);

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", inject);
} else {
  inject();
}
