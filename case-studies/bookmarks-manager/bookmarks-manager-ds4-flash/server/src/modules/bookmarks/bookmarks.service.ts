/**
 * @module modules/bookmarks/bookmarks.service
 * Business logic for bookmarks: CRUD + scraping.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { AppError } from "../../common/errors/AppError.js";
import type { Bookmark, ScrapedMetadata } from "../../common/types/index.js";
import { logger } from "../../logger.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "..", "..", "data");
const DATA_FILE = join(DATA_DIR, "bookmarks.json");

/** Ensure data directory and file exist */
function ensureDataFile(): void {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!existsSync(DATA_FILE)) {
    writeFileSync(DATA_FILE, JSON.stringify([], null, 2), "utf-8");
  }
}

/** Read all bookmarks from local JSON storage */
function readBookmarks(): Bookmark[] {
  ensureDataFile();
  const raw = readFileSync(DATA_FILE, "utf-8");
  return JSON.parse(raw) as Bookmark[];
}

/** Write bookmarks to local JSON storage */
function writeBookmarks(bookmarks: Bookmark[]): void {
  ensureDataFile();
  writeFileSync(DATA_FILE, JSON.stringify(bookmarks, null, 2), "utf-8");
}

/** Fetch and scrape metadata from a URL */
async function scrapeUrl(url: string): Promise<ScrapedMetadata> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      Number(process.env.SCRAPE_TIMEOUT_MS) || 10_000,
    );

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; BookmarksManager/1.0; +https://github.com/rule-mcp)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    clearTimeout(timeout);

    if (!response.ok) {
      throw new AppError(502, `UPSTREAM_FETCH_FAILED: HTTP ${response.status}`);
    }

    const html = await response.text();
    const domain = new URL(url).hostname;

    // Extract metadata via regex (no DOM parser needed server-side)
    const title =
      extractMeta(html, "og:title") ||
      extractMeta(html, "twitter:title") ||
      extractTag(html, "title") ||
      domain;

    const description =
      extractMeta(html, "og:description") ||
      extractMeta(html, "description") ||
      extractMeta(html, "twitter:description") ||
      "";

    const ogImage =
      extractMeta(html, "og:image") ||
      extractMeta(html, "twitter:image") ||
      "";

    // Text preview: strip tags and take first N chars
    const maxLen = Number(process.env.MAX_CONTENT_LENGTH) || 5_000;
    const textPreview = html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, maxLen);

    return { url, title, description, ogImage, domain, textPreview };
  } catch (err) {
    if (err instanceof AppError) throw err;
    logger.error({ err, url }, "Scrape failed");
    throw new AppError(502, "SCRAPE_FAILED", err instanceof Error ? err.message : undefined);
  }
}

/** Extract meta tag content by name/property */
function extractMeta(html: string, name: string): string | null {
  const patterns = [
    new RegExp(
      `<meta[^>]+(?:property|name)=["']${escapeRegex(name)}["'][^>]+content=["']([^"']*)["']`,
      "i",
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${escapeRegex(name)}["']`,
      "i",
    ),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

/** Extract inner text of an HTML tag */
function extractTag(html: string, tag: string): string | null {
  const match = html.match(
    new RegExp(`<${tag}[^>]*>([^<]*)<\\/${tag}>`, "i"),
  );
  return match?.[1]?.trim() ?? null;
}

/** Escape special regex characters */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** List all bookmarks with pagination */
export function listBookmarks(
  offset = 0,
  limit = 20,
): { data: Bookmark[]; total: number; offset: number; limit: number } {
  const bookmarks = readBookmarks();
  const paginated = bookmarks.slice(offset, offset + limit);
  return { data: paginated, total: bookmarks.length, offset, limit };
}

/** Get a single bookmark by ID */
export function getBookmark(id: string): Bookmark {
  const bookmarks = readBookmarks();
  const bookmark = bookmarks.find((b) => b.id === id);
  if (!bookmark) throw new AppError(404, "BOOKMARK_NOT_FOUND");
  return bookmark;
}

/** Create a bookmark by scraping a URL */
export async function createBookmark(url: string): Promise<Bookmark> {
  const metadata = await scrapeUrl(url);
  const now = new Date().toISOString();
  const bookmark: Bookmark = {
    id: randomUUID(),
    url: metadata.url,
    title: metadata.title,
    description: metadata.description,
    ogImage: metadata.ogImage,
    domain: metadata.domain,
    createdAt: now,
    updatedAt: now,
  };

  const bookmarks = readBookmarks();
  bookmarks.unshift(bookmark);
  writeBookmarks(bookmarks);

  return bookmark;
}

/** Delete a bookmark by ID */
export function deleteBookmark(id: string): void {
  const bookmarks = readBookmarks();
  const index = bookmarks.findIndex((b) => b.id === id);
  if (index === -1) throw new AppError(404, "BOOKMARK_NOT_FOUND");
  bookmarks.splice(index, 1);
  writeBookmarks(bookmarks);
}
