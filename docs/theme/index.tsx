import React from "react";
import { useLocation } from "@rspress/core/runtime";
import { getLocalePrefix } from "./utils";
import { HeroSection } from "./HeroSection";
import { ReallyFastSection } from "./ReallyFastSection";
import { FeaturesGrid } from "./FeaturesGrid";
import { FAQSection } from "./FAQSection";
import { HomeFooter } from "./HomeFooter";
import "./index.css";
import "../styles/theme.css";

function CustomHomeContent() {
  const { pathname } = useLocation();
  const base = getLocalePrefix(pathname);
  const getStartedLink = `${base}/guide/install`;
  const configLink = `${base}/config/manifest`;

  return (
    <>
      <div className="addfox-home min-h-screen bg-[var(--addfox-home-bg)] py-12 pb-24 box-border">
        <HeroSection
          getStartedLink={getStartedLink}
          configLink={configLink}
          githubLink="https://github.com/addfox/addfox"
        />
        <ReallyFastSection />
        <FeaturesGrid />
        <FAQSection />
      </div>
      <HomeFooter />
    </>
  );
}

export function HomeLayout() {
  return <CustomHomeContent />;
}

export * from "@rspress/core/theme-original";
export { Tab, TabLabelPnpm, TabLabelNpm, TabLabelYarn, TabLabelBun } from "./PackageManagerTab";
