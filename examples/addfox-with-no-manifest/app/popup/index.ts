// Popup script
// Addfox will auto-generate manifest with: action.default_popup

console.log("[Popup] Loaded");

const pingBtn = document.getElementById("pingBtn") as HTMLButtonElement;
const tabBtn = document.getElementById("tabBtn") as HTMLButtonElement;
const statusEl = document.getElementById("status") as HTMLDivElement;

function showStatus(message: string, type: "success" | "error" = "success") {
  statusEl.textContent = message;
  statusEl.className = `status ${type}`;
  
  setTimeout(() => {
    statusEl.className = "status";
  }, 3000);
}

// Ping background service worker
pingBtn.addEventListener("click", async () => {
  try {
    const response = await chrome.runtime.sendMessage({ type: "PING" });
    console.log("[Popup] Ping response:", response);
    showStatus(`✅ Background responded: ${new Date(response.timestamp).toLocaleTimeString()}`);
  } catch (err) {
    console.error("[Popup] Ping failed:", err);
    showStatus("❌ Failed to ping background", "error");
  }
});

// Get current tab info
tabBtn.addEventListener("click", async () => {
  try {
    const response = await chrome.runtime.sendMessage({ type: "GET_TAB_INFO" });
    console.log("[Popup] Tab info:", response);
    
    if (response.tab) {
      const title = response.tab.title?.slice(0, 30) + "..." || "Unknown";
      showStatus(`📄 Current tab: ${title}`);
    } else {
      showStatus("No active tab found", "error");
    }
  } catch (err) {
    console.error("[Popup] Get tab info failed:", err);
    showStatus("❌ Failed to get tab info", "error");
  }
});

// Notify content script on load
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  if (tabs[0]?.id) {
    chrome.tabs.sendMessage(tabs[0].id, { 
      type: "FROM_BACKGROUND", 
      payload: "Popup opened!" 
    }).catch(() => {
      // Content script might not be injected on this page
      console.log("[Popup] Content script not available on this page");
    });
  }
});
