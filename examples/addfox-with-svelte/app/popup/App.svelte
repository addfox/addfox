<script lang="ts">
  import browser from "webextension-polyfill";
  let status = "Idle";

  async function pingBackground() {
    status = "Sending...";
    try {
      const res = await browser.runtime.sendMessage({ type: "PING" });
      status = res?.from === "background" ? "Background OK" : String(res);
    } catch (e) {
      status = "Error: " + (e as Error).message;
    }
  }

  async function sendToContent() {
    status = "Sending to content...";
    try {
      const res = await browser.runtime.sendMessage({
        type: "RELAY_TO_CONTENT",
        payload: { text: "Hello from popup at " + new Date().toISOString() },
      });
      status = typeof res === "object" ? "Content: " + JSON.stringify(res) : String(res);
    } catch (e) {
      status = "Error: " + (e as Error).message;
    }
  }
</script>

<div style="width: 280px; padding: 12px; font-family: system-ui, sans-serif;">
  <h2 style="margin: 0 0 8px; font-size: 16px;">Svelte Popup</h2>
  <p style="margin: 0 0 12px; font-size: 13px; color: #666;">{status}</p>
  <button type="button" on:click={pingBackground} style="margin-right: 8px; margin-bottom: 8px; padding: 6px 12px; cursor: pointer;">
    Ping Background
  </button>
  <button type="button" on:click={sendToContent} style="margin-right: 8px; margin-bottom: 8px; padding: 6px 12px; cursor: pointer;">
    Send to Content
  </button>
</div>
