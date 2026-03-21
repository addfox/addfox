import React from "react";
import { useI18n } from "@rspress/core/runtime";
import {
  FeatureHmrFlow,
  FeatureBrowsers,
  FeatureFrameworks,
  FeatureContentUi,
  FeatureBundleAnalysis,
  FeatureZip,
  FeatureAiTerminal,
  FeatureAiMetadataTerminal,
} from "./FeatureAnimations";

function FeatureCardWrapper({
  titleKey,
  detailsKey,
  children,
  contentClassName,
}: {
  titleKey: string;
  detailsKey: string;
  children: React.ReactNode;
  contentClassName?: string;
}) {
  const t = useI18n();
  return (
    <div className="addfox-feature-card p-3.5 border border-[var(--addfox-home-border)] flex flex-col">
      <div className="mb-3 relative z-10">
        <h3 className="text-[1.0625rem] font-semibold text-[var(--addfox-home-text)] mb-1 text-left">{t(titleKey)}</h3>
        <p className="text-[0.9375rem] text-[var(--addfox-home-muted)] m-0 leading-snug text-left">{t(detailsKey)}</p>
      </div>
      <div className={`addfox-feature-content flex items-center justify-center overflow-hidden shrink-0 ${contentClassName ?? "h-[220px]"}`}>{children}</div>
    </div>
  );
}

function SimpleFeatureCard({
  icon,
  titleKey,
  detailsKey,
}: {
  icon: string;
  titleKey: string;
  detailsKey: string;
}) {
  const t = useI18n();
  return (
    <div className="addfox-feature-card p-3.5 border border-[var(--addfox-home-border)] flex flex-col">
      <div className="mb-3 relative z-10">
        <h3 className="text-[1.0625rem] font-semibold text-[var(--addfox-home-text)] mb-1 text-left">{t(titleKey)}</h3>
        <p className="text-[0.9375rem] text-[var(--addfox-home-muted)] m-0 leading-snug text-left">{t(detailsKey)}</p>
      </div>
      <div className="h-[120px] flex items-center justify-center shrink-0 addfox-feature-content">
        <span className="text-3xl" aria-hidden>{icon}</span>
      </div>
    </div>
  );
}

type FeatureItem =
  | { titleKey: string; detailsKey: string; render: () => React.ReactNode; contentClassName?: string }
  | { titleKey: string; detailsKey: string; icon: string };

const ROW1_ITEMS: FeatureItem[] = [
  { titleKey: "homeFeature5Title", detailsKey: "homeFeature5Details", render: () => <FeatureHmrFlow /> },
  { titleKey: "homeFeature4Title", detailsKey: "homeFeature4Details", render: () => <FeatureBrowsers /> },
  { titleKey: "homeFeature2Title", detailsKey: "homeFeature2Details", render: () => <FeatureFrameworks /> },
  { titleKey: "homeFeature6Title", detailsKey: "homeFeature6Details", render: () => <FeatureContentUi /> },
  { titleKey: "homeFeatureBundleAnalysisTitle", detailsKey: "homeFeatureBundleAnalysisDetails", render: () => <FeatureBundleAnalysis /> },
  { titleKey: "homeFeature8Title", detailsKey: "homeFeature8Details", render: () => <FeatureZip /> },
];

const SKILL_NAMES = [
  "migrate-to-addfox",
  "addfox-best-practices",
  "extension-functions-best-practices",
  "addfox-debugging",
  "addfox-testing",
];

/** Shuffled order for row 2 so content is distributed differently (staggered look) */
const SKILL_NAMES_ROW2 = [
  "addfox-debugging",
  "addfox-testing",
  "addfox-best-practices",
  "migrate-to-addfox",
  "extension-functions-best-practices",
];

function SkillsList() {
  // Duplicate skills 4 times to ensure enough content for seamless loop
  // The CSS animation moves by 50%, so we need at least 2x content
  const row1 = [...SKILL_NAMES, ...SKILL_NAMES, ...SKILL_NAMES, ...SKILL_NAMES];
  const row2 = [...SKILL_NAMES_ROW2, ...SKILL_NAMES_ROW2, ...SKILL_NAMES_ROW2, ...SKILL_NAMES_ROW2];
  return (
    <div className="addfox-skills-carousel">
      <div className="addfox-skills-row addfox-skills-row-1">
        {row1.map((name, i) => (
          <div key={`r1-${name}-${i}`} className="addfox-skill-card">
            <span className="addfox-skill-name">{name}</span>
          </div>
        ))}
      </div>
      <div className="addfox-skills-row addfox-skills-row-2">
        {row2.map((name, i) => (
          <div key={`r2-${name}-${i}`} className="addfox-skill-card">
            <span className="addfox-skill-name">{name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const ROW2_ITEMS: FeatureItem[] = [
  { titleKey: "homeFeatureAiMetadataTitle", detailsKey: "homeFeatureAiMetadataDetails", render: () => <FeatureAiMetadataTerminal />, contentClassName: "h-[320px]" },
  { titleKey: "homeFeature7Title", detailsKey: "homeFeature7Details", render: () => <FeatureAiTerminal />, contentClassName: "h-[320px]" },
  { titleKey: "homeFeatureSkillsTitle", detailsKey: "homeFeatureSkillsDetails", render: () => <SkillsList />, contentClassName: "h-[200px]" },
];

function FeatureRow({ titleKey, subtitleKey, items }: { titleKey: string; subtitleKey?: string; items: FeatureItem[] }) {
  const t = useI18n();
  return (
    <div className="mt-12 first:mt-0">
      <div className="text-center">
        <h2 className={`addfox-section-title inline-block text-[clamp(1.5rem,3.5vw,2.25rem)] font-bold tracking-tight text-[var(--addfox-home-text)] ${subtitleKey ? "mb-4" : "mb-6"}`}>
          {t(titleKey)}
        </h2>
      </div>
      {subtitleKey && (
        <p className="text-center text-[var(--addfox-home-muted)] text-[clamp(0.9375rem,2vw,1.0625rem)] max-w-2xl mx-auto mb-8">
          {t(subtitleKey)}
        </p>
      )}
      <div className={`grid grid-cols-1 gap-5 ${items.length === 2 ? "lg:grid-cols-2" : "lg:grid-cols-3"}`}>
        {items.map((f, i) =>
          "render" in f ? (
            <FeatureCardWrapper
              key={i}
              titleKey={f.titleKey}
              detailsKey={f.detailsKey}
              contentClassName={"contentClassName" in f ? f.contentClassName : undefined}
            >
              {f.render()}
            </FeatureCardWrapper>
          ) : (
            <SimpleFeatureCard key={i} icon={f.icon} titleKey={f.titleKey} detailsKey={f.detailsKey} />
          )
        )}
      </div>
    </div>
  );
}

function CreatorSaysContent() {
  const t = useI18n();
  const content = t("creatorSaysContent");
  
  // Split content by "Video Roll" or "VideoRoll" and wrap with link
  const parts = content.split(/(Video Roll|VideoRoll)/gi);
  
  return (
    <blockquote className="relative z-10 text-[var(--addfox-home-text)] text-[1.0625rem] leading-relaxed">
      {parts.map((part, index) => {
        if (part.toLowerCase() === "video roll" || part.toLowerCase() === "videoroll") {
          return (
            <a 
              key={index}
              href="https://videoroll.app" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-[var(--rp-c-brand)] hover:underline font-medium"
            >
              {part}
            </a>
          );
        }
        return <span key={index}>{part}</span>;
      })}
    </blockquote>
  );
}

function CreatorSays() {
  const t = useI18n();
  return (
    <div className="mt-16">
      <div className="text-center mb-8">
        <h2 className="addfox-section-title inline-block text-[clamp(1.5rem,3.5vw,2.25rem)] font-bold tracking-tight text-[var(--addfox-home-text)]">
          {t("creatorSaysTitle")}
        </h2>
      </div>
      <div className="max-w-3xl mx-auto">
        <div className="addfox-feature-card p-8 relative overflow-hidden">
          {/* Quote mark decoration */}
          <div className="absolute top-4 left-6 text-[6rem] leading-none text-[var(--rp-c-brand)] opacity-10 font-serif select-none">
            "
          </div>
          
          {/* Author avatar and name */}
          <div className="flex items-center gap-4 mb-6 relative z-10">
            <img 
              src="/creator.jpg" 
              alt="Gomi"
              className="w-14 h-14 rounded-full object-cover shadow-lg border-2 border-[var(--addfox-home-border)]"
            />
            <div>
              <div className="font-semibold text-[var(--addfox-home-text)] text-lg">Gomi</div>
              <div className="text-[var(--addfox-home-muted)] text-sm">
                Creator of{" "}
                <a 
                  href="https://videoroll.app" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-[var(--rp-c-brand)] hover:underline font-medium"
                >
                  VideoRoll
                </a>
                {" "}and AddFox
              </div>
            </div>
          </div>
          
          {/* Quote content with Video Roll link */}
          <CreatorSaysContent />
          
          {/* Decorative gradient line */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[var(--rp-c-brand)] to-transparent opacity-30" />
        </div>
      </div>
    </div>
  );
}

export function FeaturesGrid() {
  return (
    <section className="w-full mt-10">
      <FeatureRow titleKey="homeFeaturesRow1Title" subtitleKey="homeFeaturesRow1Subtitle" items={ROW1_ITEMS} />
      <FeatureRow titleKey="homeFeaturesRow2Title" subtitleKey="homeFeaturesRow2Subtitle" items={ROW2_ITEMS} />
      <CreatorSays />
    </section>
  );
}
