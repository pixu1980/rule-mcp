# 006: Keep remote scraping behind a guarded server boundary

- **Date**: 2026-07-11
- **Status**: accepted
- **Tags**: security, scraping, ssrf, api
- **Author**: rule-architect

## Context

Bookmark previews require remote HTML, metadata, image URLs, and readable text while protecting the browser from CORS and protecting the service from unsafe requests.

## Decision

Accept only HTTP(S) URLs that are not local/private targets, enforce an 8-second AbortController timeout, cap HTML parsing to 2 MB, require an HTML content type, parse with Mozilla Readability, and return structured API errors.

## Consequences

Preview behavior stays consistent across browsers and is easier to test; production deployments should add DNS pinning/egress policy and rate limiting before exposing the endpoint publicly.

## Alternatives Considered

1. Client-side fetch and parse
1. Allow arbitrary URLs with no network policy
1. Use a hosted scraping provider
