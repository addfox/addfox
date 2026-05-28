import React from "react";
import { Link } from "@rspress/core/theme";

interface BlogBackButtonProps {
  pathname: string;
  lang?: string;
}

const LABELS: Record<string, string> = {
  en: "← Back to Blog",
  zh: "← 返回博客",
  es: "← Volver al Blog",
  ja: "← ブログに戻る",
  ko: "← 블로그로 돌아가기",
  ru: "← Назад в блог",
};

export function BlogBackButton({ pathname, lang = "en" }: BlogBackButtonProps) {
  if (!pathname.includes("/blog/") || pathname.endsWith("/blog/")) {
    return null;
  }

  const base = lang === "en" ? "" : `/${lang}`;
  const label = LABELS[lang] || LABELS.en;

  return (
    <div className="mb-6">
      <Link
        href={`${base}/blog`}
        className="inline-flex items-center text-sm text-gray-500 dark:text-gray-400 hover:text-[var(--rp-c-brand)] transition-colors"
      >
        {label}
      </Link>
    </div>
  );
}
