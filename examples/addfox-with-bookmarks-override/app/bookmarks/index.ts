const desc = document.getElementById("desc");
if (desc) {
  const tips = [
    "This page is provided by the built-in bookmarks entry.",
    "chrome_url_overrides.bookmarks is auto-filled by addfox.",
  ];
  desc.textContent = tips.join(" ");
}
