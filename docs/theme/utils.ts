export function getLocalePrefix(pathname: string): string {
  if (pathname.startsWith("/zh") || pathname === "/zh" || pathname === "/zh/") {
    return "/zh";
  }
  if (pathname.startsWith("/en") || pathname === "/en" || pathname === "/en/") {
    return "/en";
  }
  return "";
}
