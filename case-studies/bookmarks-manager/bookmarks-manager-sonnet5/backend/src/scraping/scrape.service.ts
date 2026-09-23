/**
 * @module scraping/scrape.service
 *
 * Fetches a remote HTML document and extracts Open Graph metadata, a
 * favicon URL, and a short plain-text preview of the page body. Designed to
 * be defensive against slow, huge, or malicious responses: bounded timeout,
 * bounded byte size, and a locked-down `AbortController`.
 */

import * as cheerio from "cheerio";
import { AppError } from "../common/errors/AppError.js";
import { env } from "../initEnv.js";
import type { ScrapedMetadata } from "../modules/bookmarks/bookmarks.types.js";

const TEXT_PREVIEW_MAX_LENGTH = 280;

/**
 * Resolves a possibly-relative URL found in the document against the page's
 * final URL.
 *
 * @param value - raw attribute value (may be relative, absolute, or empty).
 * @param baseUrl - the page URL used to resolve relative references.
 */
function resolveUrl(value: string | undefined, baseUrl: string): string | null {
  if (!value) return null;
  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return null;
  }
}

/**
 * Extracts a short, human-readable text preview from the page body: the
 * first meaningful paragraph text, collapsed to a single line and truncated
 * on a word boundary.
 *
 * @param $ - loaded cheerio document.
 */
function extractTextPreview($: cheerio.CheerioAPI): string | null {
  const candidates = $("article p, main p, p")
    .map((_, el) => $(el).text().replace(/\s+/g, " ").trim())
    .get()
    .filter((text) => text.length > 40);

  const text = candidates[0];
  if (!text) return null;
  if (text.length <= TEXT_PREVIEW_MAX_LENGTH) return text;

  const truncated = text.slice(0, TEXT_PREVIEW_MAX_LENGTH);
  const lastSpace = truncated.lastIndexOf(" ");
  return `${truncated.slice(0, lastSpace > 0 ? lastSpace : TEXT_PREVIEW_MAX_LENGTH)}…`;
}

/**
 * Parses raw HTML into {@link ScrapedMetadata}: Open Graph tags with
 * sensible fallbacks to standard `<title>`/`<meta name="description">` and
 * the page's favicon link.
 *
 * @param html - raw HTML body.
 * @param pageUrl - the final URL of the fetched page (post-redirects), used
 * to resolve relative image/favicon URLs and as the fallback site name.
 */
export function parseMetadata(html: string, pageUrl: string): ScrapedMetadata {
  const $ = cheerio.load(html);
  const meta = (name: string): string | undefined =>
    $(`meta[property="${name}"]`).attr("content") ?? $(`meta[name="${name}"]`).attr("content");

  const title = meta("og:title") ?? $("title").first().text().trim() ?? null;
  const description = meta("og:description") ?? meta("description") ?? null;
  const imageUrl = resolveUrl(meta("og:image"), pageUrl);
  const siteName = meta("og:site_name") ?? new URL(pageUrl).hostname;
  const canonicalUrl = resolveUrl($('link[rel="canonical"]').attr("href"), pageUrl) ?? pageUrl;

  const faviconHref =
    $('link[rel="icon"]').attr("href") ??
    $('link[rel="shortcut icon"]').attr("href") ??
    $('link[rel="apple-touch-icon"]').attr("href");
  const faviconUrl = resolveUrl(faviconHref, pageUrl) ?? resolveUrl("/favicon.ico", pageUrl);

  return {
    canonicalUrl,
    title: title || null,
    description: description || null,
    imageUrl,
    faviconUrl,
    siteName: siteName || null,
    textPreview: extractTextPreview($),
  };
}

/**
 * Fetches `url` with a bounded timeout and byte budget, then extracts
 * {@link ScrapedMetadata} from the response body.
 *
 * @param url - a URL already validated by {@link assertSafeUrl}.
 * @throws {AppError} `FETCH_TIMEOUT` when the request exceeds the configured
 * timeout, or `FETCH_FAILED` for network errors, non-HTML responses, or
 * responses exceeding the configured byte budget.
 */
export async function scrapeUrl(url: URL): Promise<ScrapedMetadata> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.SCRAPE_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": env.SCRAPE_USER_AGENT,
        Accept: "text/html,application/xhtml+xml",
      },
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new AppError(504, "FETCH_TIMEOUT", "Timed out while fetching the target URL.");
    }
    throw new AppError(502, "FETCH_FAILED", "Could not reach the target URL.");
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new AppError(502, "FETCH_FAILED", `Target URL responded with status ${response.status}.`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("text/html") && !contentType.includes("xhtml")) {
    throw new AppError(422, "FETCH_FAILED", "Target URL did not return an HTML document.");
  }

  const contentLength = Number(response.headers.get("content-length") ?? 0);
  if (contentLength > env.SCRAPE_MAX_BYTES) {
    throw new AppError(422, "FETCH_FAILED", "Target document exceeds the maximum allowed size.");
  }

  const body = await readBounded(response, env.SCRAPE_MAX_BYTES);
  return parseMetadata(body, response.url || url.toString());
}

/**
 * Reads a `Response` body up to `maxBytes`, aborting the stream early if the
 * limit is exceeded — protects against unbounded or malicious payloads that
 * omit `content-length`.
 */
async function readBounded(response: Response, maxBytes: number): Promise<string> {
  if (!response.body) return response.text();

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let received = 0;
  let output = "";

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > maxBytes) {
      await reader.cancel();
      throw new AppError(422, "FETCH_FAILED", "Target document exceeds the maximum allowed size.");
    }
    output += decoder.decode(value, { stream: true });
  }

  return output;
}
