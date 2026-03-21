const now = new Date().toLocaleString();
const desc = document.getElementById("desc");
if (desc) {
  desc.textContent = `This page is provided by the built-in newtab entry. Rendered at: ${now}`;
}
