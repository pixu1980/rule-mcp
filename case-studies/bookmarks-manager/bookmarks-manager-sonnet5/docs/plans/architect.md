# architect plan

- **Role**: architect v2
- **Date**: 2026-09-27

Steps re-derived from the open findings in [the review](../reviews/architect.md) on every run, worst
first. Mark an executed step or sub-step with `[x]` - the next sync keeps the mark while its
finding stays open. This file is deleted by the run that finds nothing open.

## Steps

- [ ] **Step 1 - ARCH-001 (critical)**: Backend TypeScript build broken: zod v4 removed the 'required_error' option overload used in bookmarks.schema.ts, so tsc fails and `pnpm build` cannot produce dist/
  - [ ] **1.1**: Open backend/src/modules/bookmarks/bookmarks.schema.ts and replace every legacy zod v3 option bag ({ required_error, invalid_type_error }) with the zod v4 API ({ error: '...' } or z.string().min(1, 'message'))
  - [ ] **1.2**: Run `cd backend && npx tsc -p tsconfig.json --noEmit`; gate: exits 0 with no output
  - [ ] **1.3**: Run `cd backend && pnpm test`; gate: 8/8 tests still pass, proving schema messages unchanged for clients
  - [ ] **1.4**: Run `pnpm build` from repo root; gate: both backend and frontend builds succeed
- [ ] **Step 2 - ARCH-002 (high)**: Lint gate dead in both packages: ESLint 10 removed eslintrc support, backend/.eslintrc.json and frontend/.eslintrc.json are ignored, `pnpm lint` exits 2
  - [ ] **2.1**: Create backend/eslint.config.js flat config mirroring the current rules (typescript-eslint recommended, no-unused-vars warn with argsIgnorePattern '^_', no-explicit-any warn) and ignores for dist/node_modules
  - [ ] **2.2**: Create frontend/eslint.config.js flat config adding eslint-plugin-react-hooks recommended rules on top of the same typescript base
  - [ ] **2.3**: Delete both .eslintrc.json files once flat configs work
  - [ ] **2.4**: Run `pnpm lint` from repo root; gate: exits 0 in both packages
  - [ ] **2.5**: Add lint to the verification loop together with test so the gate cannot silently die again
- [ ] **Step 3 - ARCH-003 (high)**: SSRF guard bypassed by redirects: assertSafeUrl validates only the initial hostname, then scrapeUrl fetches with redirect: 'follow', so a public URL can 302 to a private/loopback address
  - [ ] **3.1**: Change scrapeUrl to `redirect: "manual"` and loop over up to 5 redirects, calling assertSafeUrl on each Location target before following it
  - [ ] **3.2**: Extract the redirect-following logic into a small helper (e.g. followSafeRedirects) so scrapeUrl stays readable
  - [ ] **3.3**: Guard the per-hop byte and timeout budget across the whole redirect chain, not per request
  - [ ] **3.4**: Add a vitest case in backend/src/scraping/**tests**/scrape.service.test.ts: mocked initial URL returns 302 to http://127.0.0.1/ and scrapeUrl must throw URL_NOT_ALLOWED
  - [ ] **3.5**: Gate: new test passes plus existing 8/8 backend tests pass
- [ ] **Step 4 - ARCH-004 (medium)**: Bookmark list silently truncates at 100: frontend fetchBookmarks hardcodes limit=100 and ignores the pagination envelope (x-total-count header) the backend already returns
  - [ ] **4.1**: Decide intended behavior with the user: unbounded list for a case study, or real pagination UI (load more / infinite scroll)
  - [ ] **4.2**: If unbounded: loop pages in fetchBookmarks until items.length === X-Total-Count, keeping the typed envelope
  - [ ] **4.3**: If pagination UI: thread offset/limit state through useBookmarks and BookmarkGrid
  - [ ] **4.4**: Gate: create 101 bookmarks via the API, UI shows all of them
- [ ] **Step 5 - ARCH-005 (low)**: API contract types duplicated by hand between backend bookmarks.types.ts and frontend/src/types/api.ts, with no shared source; a field renames breaks the client silently at runtime
  - [ ] **5.1**: Extract the shared contract (Bookmark, ScrapedMetadata, ApiErrorBody) into a small shared package or a single .ts file symlinked/referenced by both tsconfig projects
  - [ ] **5.2**: Point backend and frontend tsconfig path aliases at the shared types
  - [ ] **5.3**: Gate: change a Bookmark field name and confirm both `tsc --noEmit` runs fail until both sides are updated
