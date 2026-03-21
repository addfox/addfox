function setStatus(text: string): void {
  const statusEl = document.getElementById("status");
  if (statusEl) statusEl.textContent = text;
}

function bindPing(): void {
  const button = document.getElementById("ping");
  if (!button) return;
  button.addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "PING" }, (response) => {
      const from = response?.from ?? "unknown";
      setStatus(`PONG from ${from}`);
    });
  });
}

function init(): void {
  bindPing();
  chrome.runtime.sendMessage({ type: "GET_VERSION" }, (response) => {
    const version = response?.version ?? "unknown";
    setStatus(`Ready (v${version})`);
  });
}

init();
