import React from "react";
import { useI18n } from "@rspress/core/runtime";
import { BlockDevTerminal } from "./BlockDevTerminal";
import { BlockBuildTerminal } from "./BlockBuildTerminal";

function BlockLeft() {
  const t = useI18n();
  return (
    <div className="addfox-feature-card py-6 px-7 border-r border-[var(--addfox-home-border)] max-md:border-r-0 max-md:border-b max-md:border-[var(--addfox-home-border)] max-md:last:border-b-0">
      <h3 className="text-base font-semibold text-[var(--addfox-home-text)] mb-2 relative z-10">{t("homeBlock1Title")}</h3>
      <p className="text-sm text-[var(--addfox-home-muted)] leading-normal mb-4 relative z-10">{t("homeBlock1Desc")}</p>
      <div className="mt-2 relative z-10">
        <BlockDevTerminal />
      </div>
    </div>
  );
}

function BlockRight() {
  const t = useI18n();
  return (
    <div className="addfox-feature-card py-6 px-7 max-md:border-b max-md:border-[var(--addfox-home-border)] max-md:last:border-b-0">
      <h3 className="text-base font-semibold text-[var(--addfox-home-text)] mb-2 relative z-10">{t("homeBlock2Title")}</h3>
      <p className="text-sm text-[var(--addfox-home-muted)] leading-normal mb-4 relative z-10">{t("homeBlock2Desc")}</p>
      <div className="mt-2 relative z-10">
        <BlockBuildTerminal />
      </div>
    </div>
  );
}

export function SectionRedefining() {
  const t = useI18n();
  return (
    <section className="w-full mt-20 pt-12 border-t border-[var(--addfox-home-border)]">
      <div className="text-center">
        <h2 className="addfox-section-title inline-block text-[1.75rem] font-bold text-[var(--addfox-home-text)] mb-4">{t("homeFeaturesSectionTitle")}</h2>
      </div>
      <p className="text-base text-[var(--addfox-home-muted)] mb-10 max-w-2xl mx-auto text-center">{t("homeFeaturesSectionSubtitle")}</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <BlockLeft />
        <BlockRight />
      </div>
    </section>
  );
}
