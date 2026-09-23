/** Scraped link preview with a deliberate save action and safe external link. */
import type { BookmarkPreview } from "../../types/api";

interface PreviewPanelProps {
  preview: BookmarkPreview;
  isSaving: boolean;
  onSave: () => Promise<void>;
  onDismiss: () => void;
}

export function PreviewPanel({
  preview,
  isSaving,
  onSave,
  onDismiss,
}: PreviewPanelProps) {
  return (
    <article data-part="preview-panel" aria-labelledby="preview-heading">
      <header data-part="preview-header">
        <span data-part="status-dot" aria-hidden="true" />
        <p data-part="eyebrow">Freshly found</p>
        <button
          data-part="dismiss-button"
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss link preview"
        >
          ×
        </button>
      </header>
      <section data-part="preview-content">
        {preview.image && (
          <img
            data-part="preview-image"
            src={preview.image}
            alt={`${preview.title} cover`}
          />
        )}
        <p data-part="domain">{preview.domain}</p>
        <h2 id="preview-heading">{preview.title}</h2>
        <p data-part="preview-description">
          {preview.description || "A new page worth keeping close."}
        </p>
        <blockquote>
          {preview.preview ||
            "No readable text preview was found for this page."}
        </blockquote>
      </section>
      <footer data-part="preview-footer">
        <a href={preview.url} target="_blank" rel="noreferrer">
          Open original <span aria-hidden="true">↗</span>
        </a>
        <button
          data-part="save-button"
          type="button"
          onClick={onSave}
          disabled={isSaving}
        >
          {isSaving ? "Saving…" : "Save to library"}
        </button>
      </footer>
    </article>
  );
}
