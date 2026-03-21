const EXT_NAME = "[addfox-with-mv2]";

function openWelcomePage(): void {
  chrome.tabs.create({ url: chrome.runtime.getURL("welcome.html") });
}

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install" || details.reason === "update") openWelcomePage();
  console.log(`${EXT_NAME} Background installed (MV2)`);
});

chrome.runtime.onMessage.addListener(
  (
    message: { type?: string },
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: unknown) => void
  ) => {
    if (message?.type === "PING") {
      sendResponse({ type: "PONG", from: "background" });
      return true;
    }
    return false;
  }
);
