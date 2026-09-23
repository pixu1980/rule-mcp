/**
 * @module components/SearchBar/_SearchBar
 * Mega-search input for pasting URLs. Triggers scraping on submit.
 */

import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import cssText from "./_SearchBar.css?inline";

const sheet = new CSSStyleSheet();
sheet.replaceSync(cssText);

const schema = z.object({
  url: z.string().url("Enter a valid URL (include https://)"),
});

type FormData = z.infer<typeof schema>;

interface SearchBarProps {
  onSubmit: (url: string) => Promise<void>;
  submitting: boolean;
  error: string | null;
}

export function SearchBar({ onSubmit, submitting, error }: SearchBarProps) {
  const ref = useRef<HTMLElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { url: "" },
  });

  const { ref: registerRef, ...registerRest } = register("url");

  useEffect(() => {
    if (ref.current) {
      document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
    }
  }, []);

  /** Focus input on mount */
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleFormSubmit = async (data: FormData) => {
    await onSubmit(data.url);
    reset();
    inputRef.current?.focus();
  };

  return (
    <section ref={ref} data-part="search-section" aria-label="Add a bookmark">
      <h2 data-part="search-label">Add a bookmark</h2>
      <p data-part="search-hint">Paste a link to scrape its title, description, and preview image.</p>

      <form
        data-part="search-form"
        onSubmit={handleSubmit(handleFormSubmit)}
        noValidate
      >
        <div data-part="input-wrapper">
          <input
            data-part="url-input"
            type="url"
            placeholder="https://example.com/article"
            aria-label="URL to bookmark"
            aria-describedby={errors.url ? "url-error" : undefined}
            aria-invalid={errors.url ? "true" : undefined}
            disabled={submitting}
            {...registerRest}
            ref={(e) => {
              registerRef(e);
              (inputRef as React.MutableRefObject<HTMLInputElement | null>).current = e;
            }}
          />
        </div>
        <button
          data-part="search-submit"
          type="submit"
          disabled={submitting}
          aria-label={submitting ? "Scraping URL..." : "Add bookmark"}
        >
          {submitting ? (
            <>
              <span data-part="submit-spinner" aria-hidden="true" />
              Scraping…
            </>
          ) : (
            <>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 5v14" />
                <path d="M5 12h14" />
              </svg>
              Add
            </>
          )}
        </button>
      </form>

      {/* Field validation error */}
      {errors.url && (
        <p data-part="search-error" role="alert" id="url-error">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <path d="M15 9l-6 6" />
            <path d="M9 9l6 6" />
          </svg>
          {errors.url.message}
        </p>
      )}

      {/* API error */}
      {error && !errors.url && (
        <p data-part="search-error" role="alert">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <path d="M15 9l-6 6" />
            <path d="M9 9l6 6" />
          </svg>
          {error}
        </p>
      )}
    </section>
  );
}
