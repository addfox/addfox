import browser from "webextension-polyfill";

browser.runtime.onInstalled.addListener(() => {
  console.log("[background] Extension installed");
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
