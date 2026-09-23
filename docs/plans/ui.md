# ui plan

- **Role**: ui v2
- **Date**: 2026-09-23

Steps re-derived from the open findings in [the review](../reviews/ui.md) on every run, worst
first. Mark an executed step or sub-step with `[x]` - the next sync keeps the mark while its
finding stays open. This file is deleted by the run that finds nothing open.

## Steps

- [ ] **Step 1 - shell-prefs-array-join (high)**: Preferences dropdown renders literal comma characters on every page because preferences() (an array) is embedded unspread inside layout()'s array before .join("\n"), so Array.prototype.toString inserts default commas between every markup fragment.
  - [ ] **1.1**: Change `preferences(),` to `...preferences(),` at scripts/docs-site/_shell.mjs:67 so its array flattens into layout()'s outer array instead of being stringified with default commas.
  - [ ] **1.2**: Rebuild with `pnpm docs:build` and grep site-dist/**/*.html for a bare ',<' to confirm no stray commas remain.
  - [ ] **1.3**: Add a regression test in scripts/docs-site/__tests__/_build.test.mjs asserting the rendered <details data-part="prefs"> markup contains no bare comma between tags.
- [ ] **Step 2 - home-grid-hero-deadspace (medium)**: On the home page, the hero card's align-self: start inside a two-row grid-template-areas cell leaves a large empty gap under it whenever the flow+cards column is taller, unbalancing the two-column layout between the 56rem stack breakpoint and full desktop width.
  - [ ] **2.1**: Decided: set `align-self: stretch` on `section[data-part="hero"]` (scripts/docs-site/style.css:547) so the card's background and border extend to fill the full height of its grid area, matching the taller flow/cards column instead of hugging the top.
  - [ ] **2.2**: Apply the change in scripts/docs-site/style.css inside @layer home. Since the card padding is fixed and content is short, add `justify-content: center` (or similar) inside the hero card only if the stretched card leaves the CTA/heading block looking top-heavy once rendered.
  - [ ] **2.3**: Verify at 800px, 900px and 1100px viewport widths that no dead space remains between the hero card and the row below it.
- [ ] **Step 3 - prefs-theme-fowt (low)**: Theme, contrast and motion preferences are applied by prefs.js, a defer script that can run after the browser has already painted the default (system) styles, risking a flash of the wrong theme for a visitor whose stored preference differs from their OS setting.
  - [ ] **3.1**: Inline a small synchronous script at the very top of <head> (before the stylesheet <link>) in scripts/docs-site/_shell.mjs that reads the same localStorage key and sets data-theme/data-contrast/data-motion on document.documentElement before CSS is applied.
  - [ ] **3.2**: Keep prefs.js for the change-listener/sync logic, removing only the now-redundant initial applyPrefs(prefs) call from bind().
  - [ ] **3.3**: Manually verify with DevTools network throttling and an explicit theme opposite the OS setting that no flash of the wrong theme occurs.
