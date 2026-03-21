const EXT_NAME = "[firefox-template]";

console.log(`${EXT_NAME} Background loaded123`);

function openWelcomePage(): void {
  chrome.tabs.create({ url: chrome.runtime.getURL("welcome.html") });
}

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install" || details.reason === "update") openWelcomePage();
  console.log(`${EXT_NAME} Background installed`);
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "PING") {
    sendResponse({ type: "PONG", from: "background" });
    return true;
  }
  if (message?.type === "GET_VERSION") {
    sendResponse({ version: chrome.runtime.getManifest().version });
    return true;
  }
  return false;
});
