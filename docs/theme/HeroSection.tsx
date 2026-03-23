import React from "react";
import { useI18n } from "@rspress/core/runtime";
import { HeroTerminalWithAnimation } from "./HeroDemo";

function HeroActions({ getStartedLink, githubLink }: { getStartedLink: string; githubLink: string }) {
  const t = useI18n();
  const [copied, setCopied] = React.useState(false);

  const handleCopyCreateCommand = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText("pnpm create addfox-app");
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      // No-op fallback: keep button behavior silent if clipboard is blocked.
    }
  }, []);

  return (
    <div className="flex flex-wrap gap-3">
      <a
        href={getStartedLink}
        className="addfox-btn-primary inline-flex items-center px-5 py-2.5 text-sm font-semibold rounded-md bg-[var(--rp-c-brand)] text-white border border-[var(--rp-c-brand)] no-underline hover:opacity-90"
      >
        {t("homeHeroGetStarted")}
      </a>
      <div className="inline-flex items-center rounded-md border border-dashed border-orange-300/70 bg-orange-100/50 text-orange-600/80 dark:border-orange-400/30 dark:bg-orange-500/10 dark:text-orange-300/80">
        <span className="px-3 py-2.5 text-sm font-medium tracking-tight select-text">pnpm create addfox-app</span>
        <button
          type="button"
          onClick={handleCopyCreateCommand}
          className="inline-flex items-center justify-center w-10 h-10 border-l border-orange-300/60 text-orange-500/85 transition-all hover:bg-orange-100/65 hover:text-orange-600/95 dark:border-orange-400/30 dark:text-orange-300/80 dark:hover:bg-orange-500/15"
          aria-label="Copy pnpm create addfox-app"
          title="pnpm create addfox-app"
        >
          {copied ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          )}
        </button>
      </div>
      <a
        href={githubLink}
        target="_blank"
        rel="noopener noreferrer"
        className="addfox-btn-secondary inline-flex items-center px-5 py-2.5 text-sm font-semibold rounded-md bg-transparent border-2 border-[var(--rp-c-brand)] text-[var(--rp-c-brand)] no-underline hover:bg-[var(--rp-c-brand)]/10"
      >
        {t("homeHeroViewOnGithub")}
      </a>
    </div>
  );
}

function HeroContent({ getStartedLink, githubLink }: { getStartedLink: string; githubLink: string }) {
  const t = useI18n();
  return (
    <div className="min-w-0 relative z-10">
      <h1 className="text-[clamp(2.8rem,5.5vw,3.75rem)] font-bold tracking-tight leading-[1.1] text-[var(--addfox-home-text)] mb-4">
        <span className="block">{t("homeHeroLine1")}</span>
        <span className="block mt-1 addfox-gradient-text">
          {t("homeHeroLine2Purple")}
        </span>
      </h1>
      <p className="text-[1.0625rem] text-[var(--addfox-home-muted)] mb-6 max-w-[52ch] leading-relaxed">
        {t("homeHeroTagline")}
      </p>
      <HeroActions getStartedLink={getStartedLink} githubLink={githubLink} />
    </div>
  );
}

export function HeroSection({ getStartedLink, configLink, githubLink }: { getStartedLink: string; configLink: string; githubLink?: string }) {
  const repoUrl = githubLink ?? "https://github.com/addfox/addfox";
  return (
    <section className="addfox-hero-bg w-full grid grid-cols-1 md:grid-cols-2 gap-10 items-center mb-24 p-8 pb-24 rounded-2xl max-md:gap-8 max-md:p-6 max-md:pb-20 max-md:px-6 relative overflow-visible">
      {/* Decorative floating dots */}
      <div className="addfox-dot-decoration" />
      <div className="addfox-dot-decoration" />
      <div className="addfox-dot-decoration" />
      
      <HeroContent getStartedLink={getStartedLink} githubLink={repoUrl} />
      <div className="min-w-0 max-w-[420px] md:max-w-[600px] relative z-10">
        <div className="addfox-terminal-glow ml-[5%]">
          <HeroTerminalWithAnimation />
        </div>
      </div>
    </section>
  );
}
