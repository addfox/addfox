import React from "react";
import { useLang } from "@rspress/core/runtime";

export interface ExtensionItem {
  name: string;
  description?: string;
  icon: string;
  chromeStoreUrl?: string;
  edgeStoreUrl?: string;
  firefoxStoreUrl?: string;
}

const EXTENSIONS: Record<string, ExtensionItem[]> = {
  en: [
    {
      name: "Video Roll",
      description: "All-in-One browser extension to enhance your video watching experience. Rotate, zoom, download, record, VR mode, AI summarization, and more.",
      icon: "https://lh3.googleusercontent.com/6OTCPAnluByBbifpbtTkg8dZD3KyiZwHNyyEpOxpfrXffPbRK2cP8w9xY9dgdHJxSaferUfV18qSDRlvUZT3tOYT3kY=s128",
      chromeStoreUrl: "https://chromewebstore.google.com/detail/video-roll/cokngoholafkeghnhhdlmiadlojpindm",
      edgeStoreUrl: "https://microsoftedge.microsoft.com/addons/detail/video-roll/indeeigndpaahbcegcanpmbenmkbkmmn",
    },
  ],
  zh: [
    {
      name: "Video Roll",
      description: "All-in-One 浏览器扩展，增强你的视频观看体验。支持旋转、缩放、下载、录制、VR 模式、AI 总结等功能。",
      icon: "https://lh3.googleusercontent.com/6OTCPAnluByBbifpbtTkg8dZD3KyiZwHNyyEpOxpfrXffPbRK2cP8w9xY9dgdHJxSaferUfV18qSDRlvUZT3tOYT3kY=s128",
      chromeStoreUrl: "https://chromewebstore.google.com/detail/video-roll/cokngoholafkeghnhhdlmiadlojpindm",
      edgeStoreUrl: "https://microsoftedge.microsoft.com/addons/detail/video-roll/indeeigndpaahbcegcanpmbenmkbkmmn",
    },
  ],
  ja: [
    {
      name: "Video Roll",
      description: "All-in-One ブラウザ拡張機能。動画の回転、ズーム、ダウンロード、録画、VRモード、AI要約など、動画視聴体験を向上させます。",
      icon: "https://lh3.googleusercontent.com/6OTCPAnluByBbifpbtTkg8dZD3KyiZwHNyyEpOxpfrXffPbRK2cP8w9xY9dgdHJxSaferUfV18qSDRlvUZT3tOYT3kY=s128",
      chromeStoreUrl: "https://chromewebstore.google.com/detail/video-roll/cokngoholafkeghnhhdlmiadlojpindm",
      edgeStoreUrl: "https://microsoftedge.microsoft.com/addons/detail/video-roll/indeeigndpaahbcegcanpmbenmkbkmmn",
    },
  ],
  ko: [
    {
      name: "Video Roll",
      description: "All-in-One 브라우저 확장 프로그램으로 비디오 시청 경험을 향상시킵니다. 회전, 확대/축소, 다운로드, 녹화, VR 모드, AI 요약 등을 지원합니다.",
      icon: "https://lh3.googleusercontent.com/6OTCPAnluByBbifpbtTkg8dZD3KyiZwHNyyEpOxpfrXffPbRK2cP8w9xY9dgdHJxSaferUfV18qSDRlvUZT3tOYT3kY=s128",
      chromeStoreUrl: "https://chromewebstore.google.com/detail/video-roll/cokngoholafkeghnhhdlmiadlojpindm",
      edgeStoreUrl: "https://microsoftedge.microsoft.com/addons/detail/video-roll/indeeigndpaahbcegcanpmbenmkbkmmn",
    },
  ],
  ru: [
    {
      name: "Video Roll",
      description: "All-in-One браузерное расширение для улучшения просмотра видео. Поддерживает поворот, масштабирование, скачивание, запись, VR-режим, AI-саммари и многое другое.",
      icon: "https://lh3.googleusercontent.com/6OTCPAnluByBbifpbtTkg8dZD3KyiZwHNyyEpOxpfrXffPbRK2cP8w9xY9dgdHJxSaferUfV18qSDRlvUZT3tOYT3kY=s128",
      chromeStoreUrl: "https://chromewebstore.google.com/detail/video-roll/cokngoholafkeghnhhdlmiadlojpindm",
      edgeStoreUrl: "https://microsoftedge.microsoft.com/addons/detail/video-roll/indeeigndpaahbcegcanpmbenmkbkmmn",
    },
  ],
  es: [
    {
      name: "Video Roll",
      description: "Extensión de navegador All-in-One para mejorar tu experiencia de visualización de vídeos. Rotar, zoom, descargar, grabar, modo VR, resumen con IA y más.",
      icon: "https://lh3.googleusercontent.com/6OTCPAnluByBbifpbtTkg8dZD3KyiZwHNyyEpOxpfrXffPbRK2cP8w9xY9dgdHJxSaferUfV18qSDRlvUZT3tOYT3kY=s128",
      chromeStoreUrl: "https://chromewebstore.google.com/detail/video-roll/cokngoholafkeghnhhdlmiadlojpindm",
      edgeStoreUrl: "https://microsoftedge.microsoft.com/addons/detail/video-roll/indeeigndpaahbcegcanpmbenmkbkmmn",
    },
  ],
};

const LABELS: Record<string, Record<string, string>> = {
  en: {
    title: "Gallery",
    subtitle: "Extensions built with Addfox",
    submitButton: "Showcase Your Work",
    chromeStore: "Chrome Web Store",
    edgeStore: "Edge Add-ons",
    firefoxStore: "Firefox Add-ons",
  },
  zh: {
    title: "作品展览",
    subtitle: "使用 Addfox 开发的扩展作品",
    submitButton: "展示你的作品",
    chromeStore: "Chrome 应用商店",
    edgeStore: "Edge 加载项",
    firefoxStore: "Firefox 附加组件",
  },
  ja: {
    title: "ギャラリー",
    subtitle: "Addfox で開発された拡張機能",
    submitButton: "作品を展示する",
    chromeStore: "Chrome ウェブストア",
    edgeStore: "Edge アドオン",
    firefoxStore: "Firefox アドオン",
  },
  ko: {
    title: "갤러리",
    subtitle: "Addfox로 개발된 확장 프로그램",
    submitButton: "작품을 전시하세요",
    chromeStore: "Chrome 웹스토어",
    edgeStore: "Edge 애드온",
    firefoxStore: "Firefox 부가 기능",
  },
  ru: {
    title: "Галерея",
    subtitle: "Расширения, созданные с помощью Addfox",
    submitButton: "Показать свою работу",
    chromeStore: "Chrome Web Store",
    edgeStore: "Edge Add-ons",
    firefoxStore: "Firefox Add-ons",
  },
  es: {
    title: "Galería",
    subtitle: "Extensiones construidas con Addfox",
    submitButton: "Muestra tu trabajo",
    chromeStore: "Chrome Web Store",
    edgeStore: "Edge Add-ons",
    firefoxStore: "Firefox Add-ons",
  },
};

const SUBMIT_ISSUE_URL = "https://github.com/addfox/addfox/issues";

function StoreLink({
  href,
  label,
  type,
}: {
  href: string;
  label: string;
  type: "chrome" | "edge" | "firefox";
}) {
  const iconMap = {
    chrome: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 4.909c2.298 0 4.332.99 5.746 2.564L12 17.5 5.583 6.256C7.169 5.39 9.02 4.909 12 4.909zM4.243 8.364l4.243 7.273H4.909A7.009 7.009 0 014.243 8.364zm15.514 0a7.009 7.009 0 01-.666 7.273h-3.577l4.243-7.273z" />
      </svg>
    ),
    edge: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M.666 10.415a11.93 11.93 0 00-.662 3.985c0 5.05 3.651 9.768 9.633 9.768 5.594 0 9.619-4.223 9.619-9.617 0-.644-.076-1.268-.207-1.87H11.59v3.266h5.426a5.408 5.408 0 01-2.352 3.556l.002-.002 3.452 2.685c2.002-1.852 3.155-4.575 3.155-7.813 0-.758-.076-1.492-.213-2.2H.666zM21.388 4.406C19.133 1.696 15.617 0 11.637 0 5.217 0 .056 4.644.056 10.948c0 .332.022.66.06.982l3.525-2.745A6.635 6.635 0 0111.637 4.63c1.84 0 3.507.746 4.713 1.953l.002-.002 3.05-3.175h.001v-.001l-.015.001z" />
      </svg>
    ),
    firefox: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12.022 2c-5.516 0-10 4.386-10.088 9.836-.018 1.065.136 2.105.447 3.104.375-1.293 1.111-2.442 2.127-3.33-.457.744-.743 1.596-.832 2.488a7.953 7.953 0 01-.065-.999c0-4.418 3.582-8 8-8s8 3.582 8 8c0 .332-.026.659-.065.982-.008-.001-.016-.002-.023-.002-.336 0-.66.044-.967.125.307-.08.631-.125.967-.125.007 0 .015.001.023.002.088-.892.375-1.744.832-2.488-1.016.888-1.752 2.037-2.127 3.33.311-.999.465-2.039.447-3.104C22.022 6.386 17.538 2 12.022 2zm-2.5 6.5a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm5 0a1.5 1.5 0 100 3 1.5 1.5 0 000-3z" />
      </svg>
    ),
  };

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-orange-100 dark:hover:bg-orange-900/30 hover:text-orange-700 dark:hover:text-orange-300 transition-colors"
    >
      {iconMap[type]}
      {label}
    </a>
  );
}

function ExtensionCard({ item, labels }: { item: ExtensionItem; labels: Record<string, string> }) {
  return (
    <div className="group relative flex flex-col h-full rounded-2xl border border-gray-200/60 dark:border-gray-700/60 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm p-6 transition-all duration-300 ease-out hover:shadow-xl hover:-translate-y-1 hover:border-orange-300/80 dark:hover:border-orange-700/80">
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-orange-500/0 via-orange-500/0 to-orange-500/5 dark:to-orange-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

      <div className="relative flex flex-col h-full z-10">
        <div className="flex items-start gap-4 mb-4">
          <div className="flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <img
              src={item.icon}
              alt={item.name}
              className="w-full h-full object-cover"
              loading="lazy"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 24 24'%3E%3Cpath fill='%23999' d='M20 6h-4V4c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zM10 4h4v2h-4V4zm10 16H4V8h16v12z'/%3E%3C/svg%3E";
              }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-50 group-hover:text-[var(--rp-c-brand)] transition-colors">
              {item.name}
            </h3>
          </div>
        </div>

        {item.description && (
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-5 line-clamp-3 leading-relaxed flex-1">
            {item.description}
          </p>
        )}

        <div className="flex flex-wrap gap-2 mt-auto">
          {item.chromeStoreUrl && (
            <StoreLink href={item.chromeStoreUrl} label={labels.chromeStore} type="chrome" />
          )}
          {item.edgeStoreUrl && (
            <StoreLink href={item.edgeStoreUrl} label={labels.edgeStore} type="edge" />
          )}
          {item.firefoxStoreUrl && (
            <StoreLink href={item.firefoxStoreUrl} label={labels.firefoxStore} type="firefox" />
          )}
        </div>
      </div>
    </div>
  );
}

export function Gallery() {
  const lang = useLang();
  const labels = LABELS[lang] || LABELS.en;
  const extensions = EXTENSIONS[lang] || EXTENSIONS.en;

  return (
    <>
      <style>{`
        .rp-doc > h1 { font-weight: 800; letter-spacing: -0.02em; }
        .rp-doc > p { color: var(--rp-c-text-2); }
        .rp-doc-layout__sidebar,
        .rp-doc-layout__sidebar-placeholder,
        .rp-doc-layout__outline {
          display: none !important;
        }
        .rp-doc-layout__doc {
          width: 100% !important;
          max-width: 100% !important;
        }
        .rp-doc-layout__doc-container {
          margin: 0 auto;
        }
        .rspress-doc {
          min-height: 60vh;
        }
      `}</style>

      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20vh] -right-[20vw] w-[60vw] h-[60vh] rounded-full bg-orange-400/5 dark:bg-orange-500/10 blur-[120px]" />
        <div className="absolute top-[40vh] -left-[10vw] w-[40vw] h-[40vh] rounded-full bg-amber-400/5 dark:bg-amber-500/10 blur-[100px]" />
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-gray-50 mb-4">
            {labels.title}
          </h2>
          <p className="text-lg text-gray-500 dark:text-gray-400 mb-8">
            {labels.subtitle}
          </p>
          <a
            href={SUBMIT_ISSUE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold bg-[var(--rp-c-brand)] text-white hover:bg-[var(--rp-c-brand-dark)] transition-colors shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            {labels.submitButton}
          </a>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {extensions.map((item) => (
            <ExtensionCard key={item.name} item={item} labels={labels} />
          ))}
        </div>
      </div>
    </>
  );
}
