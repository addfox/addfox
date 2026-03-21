const desc = document.getElementById("desc");
if (desc) {
  const href = globalThis.location?.href ?? "unknown";
  desc.textContent = `This page is provided by the built-in history entry. Current url: ${href}`;
}
