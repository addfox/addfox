function setStatus(text: string): void {
  const statusEl = document.getElementById("status");
  if (statusEl) statusEl.textContent = text;
}

function bindSave(): void {
  const button = document.getElementById("save");
  if (!button) return;
  button.addEventListener("click", () => {
    chrome.storage.local.set({ savedAt: Date.now() }, () => {
      setStatus("Saved");
    });
  });
}

function init(): void {
  bindSave();
}

init();
