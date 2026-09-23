/**
 * @module components/BookmarkCard/_BookmarkCard
 * Displays a single bookmark with thumbnail, metadata, and delete action.
 */

import { useEffect, useRef } from "react";
import type { Bookmark } from "../../types/index.js";
import { formatDate } from "../../utils/index.js";
import cssText from "./_BookmarkCard.css?inline";

const sheet = new CSSStyleSheet();
sheet.replaceSync(cssText);

interface BookmarkCardProps {
  bookmark: Bookmark;
  index: number;
  onDelete: (id: string) => void;
}

export function BookmarkCard({ bookmark, index, onDelete }: BookmarkCardProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (ref.current) {
      document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
    }
  }, []);

  const hasImage = bookmark.ogImage && bookmark.ogImage.length > 0;

  return (
    <article
      ref={ref}
      data-part="bookmark-card"
      style={{ "--card-index": index } as React.CSSProperties}
      aria-label={`Bookmark: ${bookmark.title}`}
    >
      {/* Thumbnail */}
      {hasImage ? (
        <img
          data-part="card-thumbnail"
          src={bookmark.ogImage}
          alt={`Preview for ${bookmark.title}`}
          loading="lazy"
        />
      ) : (
        <div data-part="card-thumbnail-fallback" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 2v12a4 4 0 0 0 4 4h4a4 4 0 0 0 4-4V2" />
            <path d="M2 6h20" />
          </svg>
        </div>
      )}

      {/* Body */}
      <div data-part="card-body">
        <h3 data-part="card-title">
          <a href={bookmark.url} target="_blank" rel="noopener noreferrer">
            {bookmark.title}
          </a>
        </h3>
        {bookmark.description && (
          <p data-part="card-description">{bookmark.description}</p>
        )}
        <div data-part="card-meta">
          <span data-part="card-domain">{bookmark.domain}</span>
          <span data-part="card-date">{formatDate(bookmark.createdAt)}</span>
        </div>
      </div>

      {/* Delete */}
      <button
        data-part="card-delete"
        type="button"
        onClick={() => onDelete(bookmark.id)}
        aria-label={`Delete ${bookmark.title}`}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 6h18" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
          <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
      </button>
    </article>
  );
}
