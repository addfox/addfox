import React from "react";
import { useI18n } from "@rspress/core/runtime";

const GITHUB_URL = "https://github.com/addfox/addfox";
const WXT_URL = "https://wxt.dev";
const PLASMO_URL = "https://www.plasmo.com";
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
      className="mt-16 pt-10 pb-8 border-t border-[var(--addfox-home-border)] max-w-[var(--rp-content-max-width)] mx-auto px-[var(--addfox-home-padding-x)]"
      role="contentinfo"
    >
      <div className="flex flex-col gap-8 items-center text-center sm:items-start sm:text-left">
        <div className="flex flex-col gap-6 w-full sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClass}
          >
            {t("homeFooterGithub")}
          </a>
          <div className="flex flex-col gap-2 sm:items-end sm:text-right">
            <span className="text-sm font-medium text-[var(--addfox-home-text)]">
              {t("homeFooterFriendlyLinks")}
            </span>
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 sm:justify-end">
              <a href={WXT_URL} target="_blank" rel="noopener noreferrer" className={linkClass}>
                {t("homeFooterWxt")}
              </a>
              <span className="text-[var(--addfox-home-muted)] select-none" aria-hidden="true">
                ·
              </span>
              <a href={PLASMO_URL} target="_blank" rel="noopener noreferrer" className={linkClass}>
                {t("homeFooterPlasmo")}
              </a>
            </div>
          </div>
        </div>
        <a
          href={AGENTWORK_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rp-c-brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--addfox-home-bg)] dark:focus-visible:ring-offset-[var(--addfox-home-bg)]"
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
    </footer>
  );
}
