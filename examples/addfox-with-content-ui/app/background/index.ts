console.log("[addfox-content-ui] Background loaded");

function openWelcomePage(): void {
  chrome.tabs.create({ url: chrome.runtime.getURL("welcome.html") });
}

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install" || details.reason === "update") openWelcomePage();
  console.log("[addfox-content-ui] Extension installed");
});
