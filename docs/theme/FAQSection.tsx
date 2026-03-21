import React, { useState } from "react";
import { useI18n } from "@rspress/core/runtime";

interface FAQItem {
  questionKey: string;
  answerKey: string;
}

const FAQ_ITEMS: FAQItem[] = [
  { questionKey: "faqQuestion1", answerKey: "faqAnswer1" },
  { questionKey: "faqQuestion2", answerKey: "faqAnswer2" },
  { questionKey: "faqQuestion3", answerKey: "faqAnswer3" },
  { questionKey: "faqQuestion4", answerKey: "faqAnswer4" },
];

function FAQItemComponent({
  questionKey,
  answerKey,
  isOpen,
  onToggle,
  index,
}: FAQItem & { isOpen: boolean; onToggle: () => void; index: number }) {
  const t = useI18n();

  return (
    <div
      className={`addfox-faq-card border border-[var(--addfox-home-border)] rounded-xl overflow-hidden transition-all duration-200 ${
        isOpen ? "bg-[var(--addfox-home-card-bg)]" : "bg-transparent hover:bg-[var(--addfox-home-border)]/20"
      }`}
    >
      <button
        onClick={onToggle}
        className="relative z-10 w-full flex items-center justify-between p-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rp-c-brand)] focus-visible:ring-inset cursor-pointer"
        aria-expanded={isOpen}
        aria-controls={`faq-answer-${index}`}
      >
        <span className="text-[1rem] font-medium text-[var(--addfox-home-text)] pr-4">
          {t(questionKey)}
        </span>
        <span
          className={`flex-shrink-0 w-5 h-5 flex items-center justify-center text-[var(--addfox-home-muted)] transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="w-4 h-4"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 8.25l-7.5 7.5-7.5-7.5"
            />
          </svg>
        </span>
      </button>
      <div
        id={`faq-answer-${index}`}
        className={`grid transition-all duration-200 ease-in-out ${
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="px-4 pb-4 text-[0.9375rem] text-[var(--addfox-home-muted)] leading-relaxed">
            {t(answerKey)}
          </div>
        </div>
      </div>
    </div>
  );
}

export function FAQSection() {
  const t = useI18n();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const handleToggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="w-full mt-20">
      <div className="max-w-3xl mx-auto">
        <div className="text-center">
          <h2 className="addfox-section-title inline-block text-[clamp(1.5rem,3.5vw,2.25rem)] font-bold tracking-tight text-[var(--addfox-home-text)] mb-4">
            {t("faqTitle")}
          </h2>
        </div>
        <p className="text-center text-[var(--addfox-home-muted)] text-[clamp(0.9375rem,2vw,1.0625rem)] mb-10">
          {t("faqSubtitle")}
        </p>
        <div className="flex flex-col gap-4">
          {FAQ_ITEMS.map((item, index) => (
            <FAQItemComponent
              key={index}
              questionKey={item.questionKey}
              answerKey={item.answerKey}
              isOpen={openIndex === index}
              onToggle={() => handleToggle(index)}
              index={index}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
