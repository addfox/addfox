/**
 * Content script: uses @addfox/utils defineShadowContentUI
 * to inject a small UI panel.
 */
import { defineShadowContentUI } from "@addfox/utils";

const mountContentUI = defineShadowContentUI({
  name: "addfox-content-ui-root",
  target: "body",
  attr: {
    id: "addfox-content-ui-root",
    style:
      "position:fixed;bottom:16px;right:16px;padding:12px 16px;background:#1a1a2e;color:#eee;font-size:13px;font-family:system-ui,sans-serif;border-radius:8px;z-index:2147483647;box-shadow:0 4px 12px rgba(0,0,0,0.3);max-width:280px;",
  },
  injectMode: "append",
});

function mountUI(): void {
  const root = mountContentUI();
  const title = document.createElement("div");
  title.textContent = "Content UI (addfox)";
  title.style.fontWeight = "600";
  title.style.marginBottom = "8px";
  const desc = document.createElement("div");
  desc.textContent = "This panel is mounted with defineShadowContentUI.";
  desc.style.fontSize = "12px";
  desc.style.color = "#aaa";
  root.appendChild(title);
  root.appendChild(desc);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mountUI);
} else {
  mountUI();
}
