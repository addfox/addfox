import React from "react";
import { Link } from "@rspress/core/theme";
import { useLang, usePages } from "@rspress/core/runtime";

export interface BlogAuthor {
  name: string;
  avatar?: string;
  github?: string;
}

export interface BlogPost {
  title: string;
  description?: string;
  date?: string;
  href: string;
  authors?: BlogAuthor[];
}

const DEFAULT_AUTHOR: BlogAuthor = {
  name: "Gomi",
  avatar: "https://github.com/gxy5202.png",
  github: "gxy5202",
};

const EMPTY_LABELS: Record<string, string> = {
  en: "No blog posts yet.",
  zh: "暂无博客文章。",
  es: "Aún no hay entradas de blog.",
  ja: "まだブログ記事がありません。",
  ko: "아직 블로그 게시물이 없습니다.",
  ru: "Пока нет записей в блоге.",
};

const getDateValue = (date?: string): number => {
  if (!date) return 0;
  const timestamp = new Date(date).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
};

const formatDate = (date?: string, lang?: string): string => {
  if (!date) return "";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return date;
  try {
    return d.toLocaleDateString(lang || "en", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return d.toLocaleDateString("en", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }
};

function AuthorGroup({ authors }: { authors?: BlogAuthor[] }) {
  const list = authors?.length ? authors : [DEFAULT_AUTHOR];
  return (
    <div className="flex items-center gap-3 mt-auto pt-4 border-t border-gray-100 dark:border-gray-800">
      <div className="flex -space-x-2">
        {list.slice(0, 3).map((a, i) => (
          <img
            key={i}
            src={a.avatar || DEFAULT_AUTHOR.avatar}
            alt={a.name}
            className="w-7 h-7 rounded-full ring-2 ring-white dark:ring-gray-900 object-cover"
            loading="lazy"
          />
        ))}
      </div>
      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
        {list.map((a) => a.name).join(", ")}
      </span>
    </div>
  );
}

function PostCard({
  post,
  featured = false,
}: {
  post: BlogPost;
  featured?: boolean;
}) {
  const lang = useLang();
  return (
    <Link
      href={post.href}
      className={`group relative flex flex-col h-full rounded-3xl border border-gray-200/60 dark:border-gray-700/60 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm p-7 transition-all duration-300 ease-out hover:shadow-2xl hover:-translate-y-1.5 hover:scale-[1.01] hover:border-orange-300/80 dark:hover:border-orange-700/80 ${
        featured
          ? "md:col-span-2 md:p-10"
          : ""
      }`}
    >
      {/* subtle gradient overlay on hover */}
      <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-orange-500/0 via-orange-500/0 to-orange-500/5 dark:to-orange-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

      <div className="relative flex flex-col h-full z-10">
        {post.date && (
          <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">
            {formatDate(post.date, lang)}
          </span>
        )}
        <h3
          className={`font-extrabold text-gray-900 dark:text-gray-50 mb-3 group-hover:text-[var(--rp-c-brand)] transition-colors leading-tight ${
            featured ? "text-3xl md:text-4xl" : "text-xl"
          }`}
        >
          {post.title}
        </h3>
        {post.description && (
          <p className="text-gray-500 dark:text-gray-400 text-sm md:text-base mb-5 line-clamp-2 flex-1 leading-relaxed">
            {post.description}
          </p>
        )}
        <AuthorGroup authors={post.authors} />
      </div>
    </Link>
  );
}

export function BlogList() {
  const { pages } = usePages();
  const lang = useLang();

  const posts = pages
    .filter((page) => page.lang === lang)
    .filter(
      (page) =>
        page.routePath.includes("/blog/") && !page.routePath.endsWith("/blog/")
    )
    .map((page) => {
      const fm = (page.frontmatter ?? {}) as Record<string, any>;
      const authors = (fm.authors as BlogAuthor[]) || [];
      return {
        title: page.title || "Untitled",
        description: fm.description,
        date: fm.date,
        href: page.routePath,
        authors: authors.length ? authors : [DEFAULT_AUTHOR],
      };
    })
    .sort((a, b) => getDateValue(b.date) - getDateValue(a.date));

  if (!posts.length) {
    return (
      <div className="text-center py-24 text-gray-500 dark:text-gray-400 text-lg">
        {EMPTY_LABELS[lang] || EMPTY_LABELS.en}
      </div>
    );
  }

  const [featured, ...rest] = posts;

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

      {/* ambient background glow */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20vh] -right-[20vw] w-[60vw] h-[60vh] rounded-full bg-orange-400/5 dark:bg-orange-500/10 blur-[120px]" />
        <div className="absolute top-[40vh] -left-[10vw] w-[40vw] h-[40vh] rounded-full bg-amber-400/5 dark:bg-amber-500/10 blur-[100px]" />
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <section className="mb-8">
          <PostCard post={featured} featured />
        </section>
        {rest.length > 0 && (
          <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {rest.map((post) => (
              <PostCard key={post.href} post={post} />
            ))}
          </section>
        )}
      </div>
    </>
  );
}
