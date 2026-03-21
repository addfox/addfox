import "./style.css";

/** 与 manifest 中 devtools_page 一致，即本入口的 HTML，也是 Tab 中展示的页面 */
const DEVTOOLS_ENTRY_HTML = "devtools/index.html";

function createPanelAndInit(): void {
  if (typeof chrome === "undefined" || !chrome.devtools?.panels) return;
  chrome.devtools.panels.create("Native TS", "", DEVTOOLS_ENTRY_HTML, () => {});
  initTabs();
  fillInfoPanel();
  fillPagePanel();
  initConsolePanel();
}

function initTabs(): void {
  const tabs = document.getElementById("tabs");
  const buttons = tabs?.querySelectorAll<HTMLButtonElement>("button[data-tab]");
  const panels = document.querySelectorAll<HTMLElement>(".panel");
  if (!buttons?.length || !panels.length) return;

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const tab = btn.dataset.tab;
      buttons.forEach((b) => b.classList.toggle("active", b === btn));
      panels.forEach((p) => {
        const active = p.id === `panel-${tab}`;
        p.classList.toggle("active", active);
      });
    });
  });
}

function fillInfoPanel(): void {
  const el = document.getElementById("info-content");
  if (!el || typeof chrome === "undefined" || !chrome.runtime) return;
  const manifest = chrome.runtime.getManifest();
  el.textContent = JSON.stringify(manifest, null, 2);
}

function fillPagePanel(): void {
  const el = document.getElementById("page-content");
  if (!el || typeof chrome === "undefined" || !chrome.devtools?.inspectedWindow) return;
  chrome.devtools.inspectedWindow.eval("({ url: location.href, title: document.title })", (result, err) => {
    if (err) {
      el.textContent = `Error: ${String(err)}`;
      return;
    }
    el.textContent = typeof result === "object" && result !== null
      ? JSON.stringify(result, null, 2)
      : String(result);
  });
}

function initConsolePanel(): void {
  const input = document.getElementById("eval-input") as HTMLInputElement | null;
  const output = document.getElementById("console-content");
  if (!input || !output || typeof chrome === "undefined" || !chrome.devtools?.inspectedWindow) return;

  input.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    const code = input.value.trim();
    if (!code) return;
    chrome.devtools.inspectedWindow.eval(code, (result, err) => {
      if (err) {
        output.textContent = `Error: ${String(err)}`;
        return;
      }
      const str = typeof result === "object" && result !== null
        ? JSON.stringify(result, null, 2)
        : String(result);
      output.textContent = str;
    });
  });
}

createPanelAndInit();
