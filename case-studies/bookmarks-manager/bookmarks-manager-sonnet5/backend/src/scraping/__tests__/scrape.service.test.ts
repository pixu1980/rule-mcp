/**
 * @module scraping/__tests__/scrape.service.test
 *
 * Unit tests for HTML metadata extraction, independent of network access.
 */

import { describe, expect, it } from "vitest";
import { parseMetadata } from "../scrape.service.js";

describe("parseMetadata", () => {
  it("prefers Open Graph tags over fallbacks", () => {
    const html = `
      <html><head>
        <title>Fallback title</title>
        <meta name="description" content="fallback description" />
        <meta property="og:title" content="OG Title" />
        <meta property="og:description" content="OG description" />
        <meta property="og:image" content="/og.png" />
        <meta property="og:site_name" content="Example" />
        <link rel="icon" href="/favicon.ico" />
      </head><body><article><p>${"x".repeat(50)}</p></article></body></html>
    `;
    const result = parseMetadata(html, "https://example.com/page");
    expect(result.title).toBe("OG Title");
    expect(result.description).toBe("OG description");
    expect(result.imageUrl).toBe("https://example.com/og.png");
    expect(result.faviconUrl).toBe("https://example.com/favicon.ico");
    expect(result.siteName).toBe("Example");
  });

  it("falls back to <title> and meta description when OG tags are absent", () => {
    const html = `<html><head><title>Plain Title</title>
      <meta name="description" content="Plain description" /></head>
      <body><p>${"y".repeat(50)}</p></body></html>`;
    const result = parseMetadata(html, "https://example.org/");
    expect(result.title).toBe("Plain Title");
    expect(result.description).toBe("Plain description");
  });

  it("truncates long text previews on a word boundary", () => {
    const longText = "word ".repeat(100);
    const html = `<html><body><p>${longText}</p></body></html>`;
    const result = parseMetadata(html, "https://example.org/");
    expect(result.textPreview?.length).toBeLessThanOrEqual(281);
    expect(result.textPreview?.endsWith("…")).toBe(true);
  });
});
