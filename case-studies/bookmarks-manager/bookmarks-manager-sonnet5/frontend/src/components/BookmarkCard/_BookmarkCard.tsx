/**
 * @module components/BookmarkCard/_BookmarkCard
 *
 * Renders one saved bookmark: OG preview image, favicon + domain byline,
 * title, description, a short text excerpt, and a delete action. Marked up
 * as `<article>` because each card is independently meaningful content.
 */

import cssText from "./_BookmarkCard.css?raw";
import { useAdoptedStylesheet } from "../../hooks/useAdoptedStylesheet";
import { formatDomain } from "../../utils/formatDomain";
import type { Bookmark } from "../../types/api";

interface BookmarkCardProps {
  bookmark: Bookmark;
  onRemove: (id: string) => void;
}

/** A single bookmark preview card. */
export function BookmarkCard({ bookmark, onRemove }: BookmarkCardProps) {
  useAdoptedStylesheet(cssText);

  const domain = formatDomain(bookmark.canonicalUrl ?? bookmark.url);
  const href = bookmark.canonicalUrl ?? bookmark.url;

  return (
    <article data-part="card">
      {bookmark.imageUrl && (
        <figure data-part="preview">
          <img src={bookmark.imageUrl} alt="" loading="lazy" />
        </figure>
      )}
      <div data-part="body">
        <div data-part="byline">
          {bookmark.faviconUrl ? (
            <img data-part="favicon" src={bookmark.faviconUrl} alt="" loading="lazy" width={16} height={16} />
          ) : null}
          <span data-part="domain">{bookmark.siteName ?? domain}</span>
        </div>
        <h2 data-part="title">
          <a href={href} target="_blank" rel="noreferrer noopener">
            {bookmark.title ?? href}
          </a>
        </h2>
        {bookmark.description && <p data-part="description">{bookmark.description}</p>}
        {bookmark.textPreview && <p data-part="excerpt">{bookmark.textPreview}</p>}
      </div>
      <button
        type="button"
        data-part="delete"
        onClick={() => onRemove(bookmark.id)}
        aria-label={`Delete bookmark: ${bookmark.title ?? domain}`}
      >
        <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
          <path
            d="M3 4h10M6.5 4V2.5h3V4M4.5 4l.6 9.5a1 1 0 0 0 1 .9h3.8a1 1 0 0 0 1-.9L11.5 4"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      </button>
    </article>
  );
}
