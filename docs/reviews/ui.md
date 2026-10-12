# ui review

- **Role**: ui v2
- **Date**: 2026-10-12
- **Scope**: Review the documentation UI at localhost:3001 after closing one duplicate preview server; the request specified no further review criteria.

Findings distilled from [the audit](../audits/ui.md). A finding this run no longer reports is
flipped to resolved and kept one run for visibility, then removed.

| Finding | Severity | Status | Evidence                              | Summary                                                                                                    |
| ------- | -------- | ------ | ------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| UI-01   | high     | open   | docs/audits/ui.md#skip-navigation     | Skip-to-content scroll positions the document heading behind the sticky header, especially at mobile width |
| UI-02   | medium   | open   | docs/audits/ui.md#mobile-navigation   | Mobile reference navigation occupies over half of the first viewport before the page title                 |
| UI-03   | medium   | open   | docs/audits/ui.md#preference-storage  | Blocked localStorage makes display preferences appear selected without applying them                       |
| UI-04   | low      | open   | docs/audits/ui.md#preference-feedback | Reduce-motion preference is applied but absent from the closed Preferences summary                         |
| UI-05   | low      | open   | docs/audits/ui.md#content-hierarchy   | Home browser title repeats the project name instead of distinguishing the landing page                     |
| UI-06   | low      | open   | docs/audits/ui.md#content-hierarchy   | Site footer addresses a Markdown editor rather than a documentation reader                                 |
| UI-07   | low      | open   | docs/audits/ui.md#layout-rules        | Counter badges use grid solely to center a single numeral, contrary to the site's flex-first rule          |
