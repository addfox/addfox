const EXT_NAME = "[single-file-template]";

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
  return false;
});
