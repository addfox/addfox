export function getLocalePrefix(pathname: string): string {
  const locales = ["/zh", "/en", "/ja", "/ko", "/ru", "/es"];
  for (const locale of locales) {
    if (pathname.startsWith(locale) || pathname === locale || pathname === `${locale}/`) {
      return locale;
    }
  }
  return "";
}
