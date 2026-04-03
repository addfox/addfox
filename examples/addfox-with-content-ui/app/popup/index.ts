/**
 * Popup page script
 */
import "./style.css";

// 获取当前标签页信息
async function getCurrentTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0];
}

// 显示当前页面信息
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

// 发送消息给 content script
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

// 初始化 popup
async function init() {
  // 显示当前页面信息
  await displayPageInfo();

  // 绑定按钮事件
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
