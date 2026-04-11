import React from "react";
import { useI18n } from "@rspress/core/runtime";

const GITHUB_URL = "https://github.com/addfox/addfox";
const WXT_URL = "https://wxt.dev";
const PLASMO_URL = "https://www.plasmo.com";
const CRXSOSO_URL = "https://www.crxsoso.com";
const AGENTWORK_URL = "https://agentwork.tools";
const AGENTWORK_BADGE_SRC = "https://agentwork.tools/badge/badge_dark.svg";

function footerLinkClassName(): string {
  return "text-[var(--addfox-home-muted)] hover:text-[var(--rp-c-brand)] underline-offset-2 hover:underline transition-colors";
}

export function HomeFooter() {
  const t = useI18n();
  const linkClass = footerLinkClassName();

  return (
    <footer
      className="mt-16 w-full bg-[var(--addfox-home-block-bg)] border-t border-[var(--addfox-home-border)]"
      role="contentinfo"
    >
      <div className="max-w-[var(--rp-content-max-width)] mx-auto px-[var(--rp-content-padding-x)] py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Resources section */}
          <div className="flex flex-col gap-3">
            <span className="text-sm font-semibold text-[var(--addfox-home-text)]">
              {t("homeFooterResources")}
            </span>
            <div className="flex flex-col gap-2">
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={linkClass}
              >
                {t("homeFooterGithub")}
              </a>
            </div>
          </div>

          {/* Friendly links section */}
          <div className="flex flex-col gap-3">
            <span className="text-sm font-semibold text-[var(--addfox-home-text)]">
              {t("homeFooterFriendlyLinks")}
            </span>
            <div className="flex flex-col gap-2">
              <a href={WXT_URL} target="_blank" rel="noopener noreferrer" className={linkClass}>
                {t("homeFooterWxt")}
              </a>
              <a href={PLASMO_URL} target="_blank" rel="noopener noreferrer" className={linkClass}>
                {t("homeFooterPlasmo")}
              </a>
              <a href={CRXSOSO_URL} target="_blank" rel="noopener noreferrer" className={linkClass}>
                {t("crxsoso")}
              </a>
            </div>
          </div>

          {/* Tools section */}
          <div className="flex flex-col gap-3">
            <span className="text-sm font-semibold text-[var(--addfox-home-text)]">
              {t("homeFooterTools")}
            </span>
            <a
              href={AGENTWORK_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rp-c-brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--addfox-home-block-bg)]"
            >
              <img
                src={AGENTWORK_BADGE_SRC}
                alt={t("homeFooterAgentWorkAlt")}
                width={200}
                height={54}
                loading="lazy"
                decoding="async"
              />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
