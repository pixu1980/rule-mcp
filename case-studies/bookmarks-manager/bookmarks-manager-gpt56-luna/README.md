# Luma Bookmarks

A refined, accessible bookmarks manager built with React, Express, TypeScript, and the rule-mcp MCP standards.

## Start

```bash
pnpm install
pnpm dev
```

- Web: http://localhost:5173
- API: http://localhost:8787

## What works

- Paste a public URL into the primary field.
- Server-side fetch of HTML with timeout and content-type guard.
- Open Graph/Twitter title, description, and image extraction.
- Mozilla Readability text preview.
- Preview before save.
- Versioned Express API with zod validation, structured errors, correlation IDs, pagination, `X-Total-Count`, Helmet, CORS, and pino logs.
- Accessible semantic React UI with focus states, reduced-motion fallback, responsive layout, and microinteractions.

## Quality

```bash
pnpm test
pnpm type-check
pnpm build
pnpm lint
```

Architecture and decisions: [`docs/architecture.mdx`](docs/architecture.mdx), [`docs/adr`](docs/adr), [`docs/api/openapi.yaml`](docs/api/openapi.yaml).
