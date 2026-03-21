import browser from "webextension-polyfill";

function openWelcomePage(): void {
  browser.tabs.create({ url: browser.runtime.getURL("welcome.html") }).catch(() => {});
}

browser.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install" || details.reason === "update") openWelcomePage();
  console.log("[background]  123");
});

browser.runtime.onMessage.addListener(
  (
    msg: { type: string; payload?: unknown },
    _sender: browser.Runtime.MessageSender
  ) => {
    if (msg.type === "PING") {
      return Promise.resolve({ ok: true, from: "background" });
    }
    if (msg.type === "RELAY_TO_CONTENT") {
      return browser.tabs
        .query({ active: true, currentWindow: true })
        .then(([tab]) => {
          if (tab?.id) {
            return browser.tabs.sendMessage(tab.id, {
              type: "FROM_BACKGROUND",
              payload: msg.payload,
            });
          }
          return { error: "no_tab" };
        });
    }
    return undefined;
  }
);
