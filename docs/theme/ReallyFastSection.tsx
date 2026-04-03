import React from "react";
import { useI18n } from "@rspress/core/runtime";

interface BenchmarkData {
  name: string;
  devTime: number; // Lower is better
  buildTime: number; // Lower is better
  buildTool: string; // Build tool name
}

const BENCHMARK_DATA: BenchmarkData[] = [
  { name: "addfox", devTime: 2.04, buildTime: 1.51, buildTool: "Rsbuild 1.7.5" },
  { name: "extensionjs", devTime: 2.34, buildTime: 1.57, buildTool: "Rspack" },
  { name: "wxt", devTime: 2.36, buildTime: 1.95, buildTool: "Vite" },
  { name: "plasmo", devTime: 3.39, buildTime: 2.80, buildTool: "Parcel" },
];

// Compute max values for percentage bars
const MAX_DEV_TIME = Math.max(...BENCHMARK_DATA.map(d => d.devTime));
const MAX_BUILD_TIME = Math.max(...BENCHMARK_DATA.map(d => d.buildTime));

interface BarChartProps {
  data: BenchmarkData[];
  maxValue: number;
  unit?: string;
  valueKey: 'devTime' | 'buildTime';
}

function BenchmarkBarChart({ 
  data, 
  maxValue, 
  unit = "s",
  valueKey
}: BarChartProps) {
  return (
    <div className="flex flex-col gap-3 w-full">
      {data.map((item, index) => {
        const isFirst = index === 0;
        const value = item[valueKey];
        const percentage = (value / maxValue) * 100;
        
        return (
          <div key={item.name} className="flex items-center gap-3">
            {/* Framework name */}
            <div className="w-20 text-sm font-medium text-[var(--addfox-home-text)]">
              <span className="capitalize">{item.name}</span>
              <span className="block text-[10px] text-[var(--addfox-home-muted)] leading-tight">
                {item.buildTool}
              </span>
            </div>
            {/* Bar container */}
            <div className="flex-1 h-7 bg-[var(--addfox-term-bg)] rounded-full overflow-hidden relative">
              {/* Bar */}
              <div
                className={`h-full rounded-full transition-all duration-700 ease-out ${
                  isFirst 
                    ? "bg-gradient-to-r from-[#F97316] to-[#FB923C]" 
                    : "bg-gradient-to-r from-[#9CA3AF] to-[#D1D5DB] dark:from-[#6B7280] dark:to-[#9CA3AF]"
                }`}
                style={{ width: `${percentage}%` }}
              />
            </div>
            {/* Value */}
            <div className={`w-14 text-sm font-mono text-right ${
              isFirst ? "text-[#F97316] font-semibold" : "text-[var(--addfox-home-muted)]"
            }`}>
              {value}{unit}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ReallyFastSection() {
  const t = useI18n();
  
  return (
    <section className="w-full mb-16">
      <div className="max-w-4xl mx-auto">
        {/* Header section */}
        <div className="text-center mb-8">
          <h2 className="text-[1.75rem] font-bold text-[var(--addfox-home-text)] mb-2">
            {t("reallyFastTitle")}
          </h2>
          <p className="text-[var(--addfox-home-muted)] text-base">
            {t("reallyFastSubtitle")}
          </p>
        </div>
        
        {/* Card */}
        <div className="addfox-feature-card p-6 border border-[var(--addfox-home-border)]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Dev speed */}
            <div className="flex flex-col">
              <h3 className="text-sm font-semibold text-[var(--addfox-home-text)] mb-4 uppercase tracking-wide">
                {t("reallyFastDevTitle")}
              </h3>
              <BenchmarkBarChart 
                data={BENCHMARK_DATA} 
                maxValue={MAX_DEV_TIME + 0.5}
                valueKey="devTime"
              />
              <p className="text-xs text-[var(--addfox-home-muted)] mt-3">
                {t("reallyFastDevDesc")}
              </p>
            </div>
            
            {/* Build speed */}
            <div className="flex flex-col">
              <h3 className="text-sm font-semibold text-[var(--addfox-home-text)] mb-4 uppercase tracking-wide">
                {t("reallyFastBuildTitle")}
              </h3>
              <BenchmarkBarChart 
                data={BENCHMARK_DATA} 
                maxValue={MAX_BUILD_TIME + 0.5}
                valueKey="buildTime"
              />
              <p className="text-xs text-[var(--addfox-home-muted)] mt-3">
                {t("reallyFastBuildDesc")}
              </p>
            </div>
          </div>
          
          {/* Footnote */}
          <div className="mt-6 pt-4 border-t border-[var(--addfox-home-border)] text-center relative">
            <p className="text-xs text-[var(--addfox-home-muted)] mb-2">
              {t("reallyFastFootnote")}
            </p>
            <a 
              href="https://github.com/addfox/addfox/blob/main/benchmark/README.md" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-block text-xs text-[var(--rp-c-brand)] hover:underline px-2 py-1"
            >
              benchmark详情 →
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
