function setStatus(text: string): void {
  const statusEl = document.getElementById("status");
  if (statusEl) statusEl.textContent = text;
}

function bindPing(): void {
  const button = document.getElementById("ping");
  if (!button) return;
  button.addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "PING" }, (response: { from?: string } | undefined) => {
      const from = response?.from ?? "unknown";
      setStatus(`PONG from ${from}`);
    });
  });
}

function init(): void {
  bindPing();
}

init();
