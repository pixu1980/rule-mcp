# ADR 003: URL Scraping Architecture

## Status

Accepted

## Context

Users paste URLs that need to be scraped for metadata: title, description, OG image, text preview.
The scraping must happen server-side to avoid CORS issues and to keep the client lightweight.

## Decision

- **Server-side scraping** using `fetch()` (Node 20+ built-in) with AbortController timeout
- **HTML parsing via regex**, no DOM parser dependency needed for extracting `<title>`, `<meta>` tags
- **User-Agent** set to a descriptive string for transparent scraping
- **Timeout** configurable via `SCRAPE_TIMEOUT_MS` env var (default 10s)
- **Text preview** stripped of `<style>`/`<script>` + HTML tags, truncated to `MAX_CONTENT_LENGTH`
- **Storage**: JSON file on disk (local-first, upgrades to PostgreSQL later)
- **Error handling**: 502 with correlation ID on scrape failure, 404 on missing bookmark

## Consequences

- No external scraping service dependency
- Fast for common sites with well-formed OG tags
- Regex parsing is limited but sufficient for metadata extraction
- JSON storage is simple but won't scale to high concurrency (future: SQLite/PostgreSQL)
