/** Compact saved bookmark card designed for scanning and keyboard navigation. */
import type { Bookmark } from "../../types/api";

export function BookmarkCard({ bookmark }: { bookmark: Bookmark }) {
  return (
    <li>
      <article data-part="bookmark-card">
        <header data-part="card-header">
          <p data-part="domain">{bookmark.domain}</p>
          <time dateTime={bookmark.createdAt}>
            {new Date(bookmark.createdAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </time>
        </header>
        <h3>
          <a href={bookmark.url} target="_blank" rel="noreferrer">
            {bookmark.title}
          </a>
        </h3>
        <p data-part="card-description">{bookmark.description}</p>
        <p data-part="card-preview">{bookmark.preview}</p>
        <footer data-part="card-footer">
          <a href={bookmark.url} target="_blank" rel="noreferrer">
            Read story <span aria-hidden="true">↗</span>
          </a>
        </footer>
      </article>
    </li>
  );
}
