import React from "react";
import { useI18n } from "@rspress/core/runtime";

interface BenchmarkData {
  name: string;
  version: string;
  devTime: number; // Lower is better
  buildTime: number; // Lower is better
  size: number; // Lower is better (KB)
  buildTool: string; // Build tool name
}

const BENCHMARK_DATA: BenchmarkData[] = [
  { name: "addfox", version: "0.2.0", devTime: 2.41, buildTime: 1.44, size: 836.8, buildTool: "Rsbuild 2.0.7" },
  { name: "extensionjs", version: "3.17.0", devTime: 2.10, buildTime: 1.52, size: 1450.8, buildTool: "Rspack 2.0.x" },
  { name: "wxt", version: "0.20.26", devTime: 2.18, buildTime: 1.82, size: 811.8, buildTool: "Vite 8.0.14" },
  { name: "plasmo", version: "0.90.5", devTime: 3.02, buildTime: 2.62, size: 1364.8, buildTool: "Parcel 2.9.3" },
];

// Compute max values for percentage bars
const MAX_DEV_TIME = Math.max(...BENCHMARK_DATA.map(d => d.devTime));
const MAX_BUILD_TIME = Math.max(...BENCHMARK_DATA.map(d => d.buildTime));
const MAX_SIZE = Math.max(...BENCHMARK_DATA.map(d => d.size));

interface BarChartProps {
  data: BenchmarkData[];
  maxValue: number;
  unit?: string;
  valueKey: 'devTime' | 'buildTime' | 'size';
}

function formatSize(kb: number): string {
  if (kb >= 1000) {
    return `${(kb / 1000).toFixed(2)}MB`;
  }
  return `${kb.toFixed(0)}KB`;
}

function BenchmarkBarChart({ 
  data, 
  maxValue, 
  unit = "s",
  valueKey
}: BarChartProps) {
  // Sort by metric ascending (fastest / smallest first)
  const sortedData = [...data].sort((a, b) => a[valueKey] - b[valueKey]);

  return (
    <div className="flex flex-col gap-3 w-full">
      {sortedData.map((item) => {
        const isFirst = item.name === "addfox";
        const value = item[valueKey];
        const percentage = (value / maxValue) * 100;
        
        return (
          <div key={item.name} className="flex items-center gap-3">
            {/* Framework name */}
            <div className="w-24 text-sm font-medium text-[var(--addfox-home-text)]">
              <span className="capitalize">{item.name}</span>
              <span className="block text-[10px] text-[var(--addfox-home-muted)] leading-tight">
                v{item.version} · {item.buildTool}
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
            <div className={`w-16 text-sm font-mono text-right ${
              isFirst ? "text-[#F97316] font-semibold" : "text-[var(--addfox-home-muted)]"
            }`}>
              {valueKey === 'size' ? formatSize(value) : `${value}${unit}`}
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
      <div className="mx-auto">
        {/* Header section */}
        <div className="text-center mb-8">
          <h2 className="addfox-section-title text-[1.75rem] font-bold text-[var(--addfox-home-text)] mb-6">
            {t("reallyFastTitle")}
          </h2>
          <p className="text-[var(--addfox-home-muted)] text-base">
            {t("reallyFastSubtitle")}
          </p>
        </div>
        
        {/* Card */}
        <div className="addfox-feature-card p-6 border border-[var(--addfox-home-border)]">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
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

            {/* Build size */}
            <div className="flex flex-col">
              <h3 className="text-sm font-semibold text-[var(--addfox-home-text)] mb-4 uppercase tracking-wide">
                {t("reallyFastSizeTitle")}
              </h3>
              <BenchmarkBarChart 
                data={BENCHMARK_DATA} 
                maxValue={MAX_SIZE + 200}
                unit="KB"
                valueKey="size"
              />
              <p className="text-xs text-[var(--addfox-home-muted)] mt-3">
                {t("reallyFastSizeDesc")}
              </p>
            </div>
          </div>
          
          {/* Footnote */}
          <div className="mt-6 pt-4 border-t border-[var(--addfox-home-border)] text-center relative">
            <p className="text-xs text-[var(--addfox-home-muted)] mb-2">
              {t("reallyFastFootnote")}
            </p>
            <a 
              href="https://github.com/addfox/benchmark" 
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
