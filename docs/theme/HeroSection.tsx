import React from "react";
import { useI18n } from "@rspress/core/runtime";
import { HeroTerminalWithAnimation } from "./HeroDemo";

function HeroActions({ getStartedLink, githubLink }: { getStartedLink: string; githubLink: string }) {
  const t = useI18n();
  return (
    <div className="flex flex-wrap gap-3">
      <a
        href={getStartedLink}
        className="addfox-btn-primary inline-flex items-center px-5 py-2.5 text-sm font-semibold rounded-md bg-[var(--rp-c-brand)] text-white border border-[var(--rp-c-brand)] no-underline hover:opacity-90"
      >
        {t("homeHeroGetStarted")}
      </a>
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
