/**
 * Popup page script
 */
import "./style.css";

// Get the current tab information
async function getCurrentTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0];
}

// Display the current page information
async function displayPageInfo() {
  const tab = await getCurrentTab();
  const titleEl = document.getElementById("page-title");
  const urlEl = document.getElementById("page-url");
  const faviconEl = document.getElementById("page-favicon") as HTMLImageElement;

  if (titleEl && tab.title) {
    titleEl.textContent = tab.title;
  }
  if (urlEl && tab.url) {
    urlEl.textContent = tab.url;
  }
  if (faviconEl && tab.favIconUrl) {
    faviconEl.src = tab.favIconUrl;
  }
}

// Send a message to the content script
async function sendMessageToContent(message: unknown) {
  const tab = await getCurrentTab();
  if (tab.id) {
    try {
      return await chrome.tabs.sendMessage(tab.id, message);
    } catch (e) {
      console.error("Failed to send message to content script:", e);
      return null;
    }
  }
}

// Initialize the popup
async function init() {
  // Display the current page information
  await displayPageInfo();

  // Bind button events
  const toggleBtn = document.getElementById("btn-toggle-ui");
  const refreshBtn = document.getElementById("btn-refresh");

  toggleBtn?.addEventListener("click", async () => {
    await sendMessageToContent({
      from: "popup",
      action: "toggleUI",
    });
  });

  refreshBtn?.addEventListener("click", () => {
    displayPageInfo();
  });
}

document.addEventListener("DOMContentLoaded", init);
