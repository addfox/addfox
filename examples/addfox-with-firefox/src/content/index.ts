const badgeId = "addfox-firefox-template-badge";

function createBadge(): HTMLDivElement {
  const badge = document.createElement("div");
  badge.id = badgeId;
  badge.textContent = "Firefox Template Active";
  badge.style.position = "fixed";
  badge.style.bottom = "16px";
  badge.style.right = "16px";
  badge.style.padding = "6px 10px";
  badge.style.background = "#ff7139";
  badge.style.color = "#fff";
  badge.style.borderRadius = "8px";
  badge.style.fontSize = "12px";
  badge.style.zIndex = "999999";
  return badge;
}

function mountBadge(): void {
  if (document.getElementById(badgeId)) return;
  document.body.appendChild(createBadge());
}

mountBadge();
