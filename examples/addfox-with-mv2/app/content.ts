const badgeId = "addfox-with-mv2-badge";

function createBadge(): HTMLDivElement {
  const badge = document.createElement("div");
  badge.id = badgeId;
  badge.textContent = "addfox-with-mv2 active";
  badge.style.cssText =
    "position:fixed;bottom:16px;right:16px;padding:6px 10px;background:#c44;color:#fff;border-radius:8px;font-size:12px;z-index:999999";
  return badge;
}

function mountBadge(): void {
  if (document.getElementById(badgeId)) return;
  document.body.appendChild(createBadge());
}

mountBadge();
