/** Fetches remote pages safely and turns HTML into bookmark metadata. */
import { restoreUndiciDispatcher } from "./undici-dispatcher.js";
import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
import type { BookmarkMetadata } from "../../types.js";

// jsdom installs its own global dispatcher while loading; clear it once here so
// Node's built-in fetch keeps managing its own from the first request onward.
restoreUndiciDispatcher();

const MAX_HTML_LENGTH = 2_000_000;
const PRIVATE_IPV4 = /^(10|127|169\.254|192\.168|172\.(1[6-9]|2\d|3[0-1]))\./;

/** Reject non-web protocols and local/private network targets. */
export function isPublicHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, "");
    const privateIpv6 =
      hostname === "::1" ||
      hostname.startsWith("fc") ||
      hostname.startsWith("fd") ||
      hostname.startsWith("fe80:");
    return (
      (parsed.protocol === "http:" || parsed.protocol === "https:") &&
      hostname !== "localhost" &&
      !privateIpv6 &&
      !hostname.endsWith(".local") &&
      !PRIVATE_IPV4.test(hostname)
    );
  } catch {
    return false;
  }
}

function firstMeta(document: Document, selectors: string[]): string | null {
  for (const selector of selectors) {
    const content = document
      .querySelector(selector)
      ?.getAttribute("content")
      ?.trim();
    if (content) return content;
  }
  return null;
}

function cleanText(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

/** Extract Open Graph fields, canonical title, domain, and readable body text. */
export function extractMetadataFromHtml(
  html: string,
  sourceUrl: string,
): BookmarkMetadata {
  const dom = new JSDOM(html, { url: sourceUrl });
  const { document } = dom.window;
  const parsedUrl = new URL(sourceUrl);
  const article = new Readability(document).parse();
  const title =
    firstMeta(document, [
      "meta[property='og:title']",
      "meta[name='twitter:title']",
    ]) ??
    (cleanText(document.title) || parsedUrl.hostname);
  const description =
    firstMeta(document, [
      "meta[property='og:description']",
      "meta[name='description']",
      "meta[name='twitter:description']",
    ]) ?? "";
  const imageValue = firstMeta(document, [
    "meta[property='og:image']",
    "meta[name='twitter:image']",
  ]);
  const image = imageValue ? new URL(imageValue, sourceUrl).toString() : null;
  const readable = cleanText(article?.textContent);
  const fallback = cleanText(
    document.querySelector("main")?.textContent ?? document.body.textContent,
  );

  return {
    title: cleanText(title),
    description: cleanText(description),
    image,
    domain: parsedUrl.hostname.replace(/^www\./, ""),
    preview: (readable || fallback || description).slice(0, 420),
  };
}

/** Fetch a remote HTML document with bounded size and timeout. */
export async function fetchBookmarkMetadata(
  url: string,
): Promise<BookmarkMetadata> {
  if (!isPublicHttpUrl(url)) throw new Error("URL_NOT_ALLOWED");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": "LumaBookmarks/1.0",
      },
    });
    if (!response.ok) throw new Error("REMOTE_FETCH_FAILED");
    const contentType = response.headers.get("content-type") ?? "";
    if (
      !contentType.includes("text/html") &&
      !contentType.includes("application/xhtml+xml")
    ) {
      throw new Error("REMOTE_CONTENT_NOT_HTML");
    }
    const html = (await response.text()).slice(0, MAX_HTML_LENGTH);
    return extractMetadataFromHtml(html, url);
  } finally {
    clearTimeout(timeout);
  }
}
