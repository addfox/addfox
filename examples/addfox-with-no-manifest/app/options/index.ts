// Options page script
// Addfox will auto-generate manifest with: options_ui.page

console.log("[Options] Page loaded");

// Options page can be used to configure extension settings
// The manifest options_ui.open_in_tab is set to true by default

document.addEventListener("DOMContentLoaded", () => {
  console.log("[Options] DOM ready");
  
  // Example: Load saved settings
  chrome.storage?.sync.get(["enabled", "theme"], (result) => {
    console.log("[Options] Loaded settings:", result);
  });
});

// Listen for messages from other parts of the extension
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("[Options] Received message:", message);
  
  if (message.type === "SETTINGS_UPDATED") {
    // Refresh UI with new settings
    console.log("[Options] Settings updated");
  }
});
