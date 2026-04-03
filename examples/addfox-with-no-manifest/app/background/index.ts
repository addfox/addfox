// Background service worker
// Addfox will auto-generate manifest with: background.service_worker

console.log("[Background] Service worker started");

// Listen for extension installation
chrome.runtime.onInstalled.addListener((details) => {
  console.log("[Background] Extension installed:", details.reason);
});

// Listen for messages from popup/content
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("[Background] Received message:", message, "from:", sender);
  
  if (message.type === "PING") {
    sendResponse({ from: "background", timestamp: Date.now() });
    return true;
  }
  
  if (message.type === "GET_TAB_INFO") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      sendResponse({ tab: tabs[0] });
    });
    return true; // Keep channel open for async response
  }
});

// Example: Alarm for periodic tasks
chrome.alarms?.create("heartbeat", { periodInMinutes: 5 });
chrome.alarms?.onAlarm.addListener((alarm) => {
  console.log("[Background] Alarm triggered:", alarm.name);
});
