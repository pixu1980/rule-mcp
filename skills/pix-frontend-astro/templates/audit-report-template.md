# Astro Performance Audit Report

## Summary

## Highest-impact finding

## Findings

### 1. Finding title

- Pattern:
- Severity:
- Location:
- Risk:
- Suggested fix:
- Effort: small | medium | large

## Priority order

1. Client JS footprint (directives, islands, frameworks)
2. View Transitions and prefetch
3. Image optimization
4. Content architecture (Collections, SSG)
5. Layout structure
6. Resource loading

## Measurement suggestions

- Lighthouse / PageSpeed Insights for Core Web Vitals
- Browser DevTools Network panel for JS bundle sizes
- `astro build` output for per-page bundle analysis

## Rules of thumb

- client:visible > client:idle > client:load
- Small islands, not whole pages
- ViewTransitions + prefetch always
- <Image /> for local images
- SSG by default
- Vanilla JS over frameworks for simple UI
