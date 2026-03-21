import { defineComponent, ref } from "vue";
import browser from "webextension-polyfill";

export default defineComponent({
  name: "PopupApp",
  setup() {
    const status = ref("Idle");

    async function pingBackground() {
      status.value = "Sending...";
      try {
        const res = await browser.runtime.sendMessage({ type: "PING" });
        status.value = res?.from === "background" ? "Background OK" : String(res);
      } catch (e) {
        status.value = "Error: " + (e as Error).message;
      }
    }

    async function sendToContent() {
      status.value = "Sending to content...";
      try {
        const res = await browser.runtime.sendMessage({
          type: "RELAY_TO_CONTENT",
          payload: { text: "Hello from popup at " + new Date().toISOString() },
        });
        status.value = typeof res === "object" ? "Content: " + JSON.stringify(res) : String(res);
      } catch (e) {
        status.value = "Error: " + (e as Error).message;
      }
    }

    return () => (
      <div class="popup">
        <h2>Vue TSX Popup</h2>
        <p>{status.value}</p>
        <button onClick={pingBackground}>Ping Background</button>
        <button onClick={sendToContent}>Send to Content</button>
      </div>
    );
  },
});
