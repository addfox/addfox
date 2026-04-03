// Content script - injected into web pages
// Addfox will auto-generate manifest with: content_scripts[0].matches: ["<all_urls>"]

console.log("[Content] Script loaded on:", window.location.href);

// Create a visual indicator that the content script is active
const badge = document.createElement("div");
badge.id = "addfox-content-badge";
badge.textContent = "🦊 Addfox";
badge.style.cssText = `
  position: fixed;
  top: 10px;
  right: 10px;
  background: #f97316;
  color: white;
  padding: 8px 12px;
  border-radius: 20px;
  font-family: system-ui, sans-serif;
  font-size: 12px;
  font-weight: bold;
  z-index: 2147483647;
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
  cursor: pointer;
  transition: transform 0.2s;
`;

badge.addEventListener("mouseenter", () => {
  badge.style.transform = "scale(1.05)";
});

badge.addEventListener("mouseleave", () => {
  badge.style.transform = "scale(1)";
});

document.body.appendChild(badge);

// Listen for messages from background/popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("[Content] Received message:", message);
  
  if (message.type === "FROM_BACKGROUND") {
    badge.textContent = `🦊 ${message.payload || "Updated!"}`;
    badge.style.background = "#22c55e";
    
    setTimeout(() => {
      badge.style.background = "#f97316";
      badge.textContent = "🦊 Addfox";
    }, 2000);
    
    sendResponse({ received: true });
  }
});

// Example: Modify page content
const headings = document.querySelectorAll("h1");
if (headings.length > 0) {
  console.log("[Content] Found headings:", headings.length);
}
