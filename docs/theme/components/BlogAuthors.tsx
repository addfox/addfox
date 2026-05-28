import React from "react";

export interface BlogAuthor {
  name: string;
  avatar?: string;
  github?: string;
}

export interface BlogAuthorsProps {
  authors?: BlogAuthor[];
}

const DEFAULT_AUTHOR: BlogAuthor = {
  name: "Gomi",
  avatar: "https://github.com/gxy5202.png",
  github: "gxy5202",
};

function getGithubUrl(github?: string): string {
  if (!github) return "#";
  if (github.startsWith("http")) return github;
  return `https://github.com/${github}`;
}

export function BlogAuthors({ authors }: BlogAuthorsProps) {
  const list = authors?.length ? authors : [DEFAULT_AUTHOR];

  return (
    <div className="flex flex-wrap items-center gap-4 my-6">
      {list.map((author, index) => (
        <a
          key={index}
          href={getGithubUrl(author.github)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 group"
        >
          <img
            src={author.avatar || DEFAULT_AUTHOR.avatar}
            alt={author.name}
            className="w-8 h-8 rounded-full object-cover border border-gray-200 dark:border-gray-700 group-hover:border-[var(--rp-c-brand)] transition-colors"
            loading="lazy"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-[var(--rp-c-brand)] transition-colors">
            {author.name}
          </span>
        </a>
      ))}
    </div>
  );
}
