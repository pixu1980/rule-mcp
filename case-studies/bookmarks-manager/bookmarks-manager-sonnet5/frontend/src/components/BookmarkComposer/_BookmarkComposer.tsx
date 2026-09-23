/**
 * @module components/BookmarkComposer/_BookmarkComposer
 *
 * The primary interaction of the app: a single prominent URL field (the
 * "mega-search" pattern) that, on submit, triggers server-side scraping of
 * the pasted link. Renders inside a `<search>` landmark with a real
 * `<form>` and an explicitly associated `<label>`, client-side validates
 * the URL shape before calling the network, and surfaces both a submitting
 * state and an inline validation/error message via `aria-describedby`.
 */

import { useEffect, useRef, useState, type FormEvent } from "react";
import cssText from "./_BookmarkComposer.css?raw";
import { useAdoptedStylesheet } from "../../hooks/useAdoptedStylesheet";
import { Toast } from "../Toast";

type ComposerStatus = "idle" | "submitting" | "error";

interface BookmarkComposerProps {
  status: ComposerStatus;
  errorMessage: string | null;
  onSubmit: (url: string) => void;
  onDismissError: () => void;
}

/** Returns true when `value` parses as an absolute http(s) URL. */
function isLikelyUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/** The paste-a-link composer: input, submit button, and status feedback. */
export function BookmarkComposer({ status, errorMessage, onSubmit, onDismissError }: BookmarkComposerProps) {
  useAdoptedStylesheet(cssText);

  const [value, setValue] = useState("");
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const wasSubmitting = useRef(false);

  // Clear the field once a submission transitions from "submitting" back to
  // "idle" — i.e. it succeeded. Errors keep the field's text so the user can
  // fix and resubmit without retyping.
  useEffect(() => {
    if (wasSubmitting.current && status === "idle") {
      setValue("");
    }
    wasSubmitting.current = status === "submitting";
  }, [status]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = value.trim();

    if (!isLikelyUrl(trimmed)) {
      setValidationMessage("Enter a full link starting with https:// or http://");
      return;
    }

    setValidationMessage(null);
    onSubmit(trimmed);
  }

  const isSubmitting = status === "submitting";
  const describedBy = validationMessage ? "composer-hint composer-validation" : "composer-hint";

  return (
    <search data-part="composer">
      <form onSubmit={handleSubmit} noValidate>
        <label htmlFor="bookmark-url" data-part="label">
          Paste a link to save it
        </label>
        <div data-part="field">
          <input
            id="bookmark-url"
            name="url"
            type="url"
            inputMode="url"
            autoComplete="url"
            placeholder="https://example.com/an-interesting-article"
            data-part="input"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            aria-describedby={describedBy}
            aria-invalid={validationMessage ? "true" : "false"}
            disabled={isSubmitting}
            required
          />
          <button type="submit" data-part="submit" disabled={isSubmitting} aria-busy={isSubmitting}>
            {isSubmitting ? (
              <>
                <span data-part="spinner" aria-hidden="true" />
                Saving…
              </>
            ) : (
              "Save link"
            )}
          </button>
        </div>
        <p id="composer-hint" data-part="hint">
          Works with articles, docs, videos and product pages — we fetch the title, image and a preview.
        </p>
        {validationMessage && (
          <p id="composer-validation" data-part="validation" role="alert">
            {validationMessage}
          </p>
        )}
      </form>
      {status === "error" && errorMessage && (
        <Toast tone="error" onDismiss={onDismissError}>
          {errorMessage}
        </Toast>
      )}
    </search>
  );
}
