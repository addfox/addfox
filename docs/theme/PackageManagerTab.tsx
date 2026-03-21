import React from "react";
import { Tab as OriginalTab } from "@rspress/core/theme-original";

type TabProps = { label?: string | React.ReactNode; disabled?: boolean; children: React.ReactNode };

const PACKAGE_MANAGER_ICONS: Record<string, string> = {
  pnpm: "https://cdn.simpleicons.org/pnpm/F69220",
  npm: "https://cdn.simpleicons.org/npm/CB3837",
  yarn: "https://cdn.simpleicons.org/yarn/2C8EBB",
  bun: "https://cdn.simpleicons.org/bun/fbf0df",
};

function LabelWithIcon({ iconUrl, text }: { iconUrl: string; text: string }) {
  return (
    <span
      className="rp-tabs__label-with-icon"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        pointerEvents: "none",
        userSelect: "none",
      }}
    >
      <img src={iconUrl} alt="" width={16} height={16} style={{ flexShrink: 0 }} draggable={false} />
      <span>{text}</span>
    </span>
  );
}

/** 供 MDX 用作 Tab label：图标 + 文字，如 label={<TabLabelPnpm />} */
export function TabLabelPnpm() {
  return <LabelWithIcon iconUrl={PACKAGE_MANAGER_ICONS.pnpm} text="pnpm" />;
}

export function TabLabelNpm() {
  return <LabelWithIcon iconUrl={PACKAGE_MANAGER_ICONS.npm} text="npm" />;
}

export function TabLabelYarn() {
  return <LabelWithIcon iconUrl={PACKAGE_MANAGER_ICONS.yarn} text="yarn" />;
}

export function TabLabelBun() {
  return <LabelWithIcon iconUrl={PACKAGE_MANAGER_ICONS.bun} text="bun" />;
}

export function Tab(props: TabProps): React.ReactElement {
  const { label, ...rest } = props;
  const resolvedLabel =
    typeof label === "string" && PACKAGE_MANAGER_ICONS[label.toLowerCase()]
      ? <LabelWithIcon iconUrl={PACKAGE_MANAGER_ICONS[label.toLowerCase()]} text={label} />
      : label;
  return <OriginalTab {...rest} label={resolvedLabel} />;
}
