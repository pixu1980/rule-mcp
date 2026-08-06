# Governance & Compliance Strategy Guide

> **Scope:** Static verification, VPAT strategy, ADA/EAA compliance, EN 301 549, audit readiness | **WCAG:** EN 301 549, ADA, EAA

## 1. Static Verification (The Engineering Minimum)

- **Code Standard:** Code MUST pass linters or accessibility-focused evaluators (`eslint-plugin-jsx-a11y`, `axe-core`) without critical/serious violations before consolidation.
- **Decoupling:** Adopt agnostic libraries (Headless UI) whenever native HTML semantics do not cover the feature requirements.

## 2. Descriptive Evidence (The "Why")

When creating custom complex widgets, include a comment block explaining the accessibility strategy:

- What is the focus order?
- How are states communicated?
- What is the fallback for non-JS environments?

```tsx
// Focus order: trigger → modal title → confirm → cancel → close
// Escape closes. aria-modal="true" backgrounds inert.
// Fallback: <noscript> links to non-JS version.
```

## 3. Visual Language Constraints

- **Color:** Never communicate state (Valid/Invalid/Warning) using only color. Accompanying icon or text description is mandatory.
- **Contrast:** Brand colors that fail 4.5:1 ratio must be adjusted or paired with a high-contrast alternative.

## 4. Audits and Legal Compliance (ADA/EAA Readiness)

1. **Inventory:** Consolidate a list or storybook of key visual components and their behaviors with assistive technologies.
2. **Keyboard Path:** Prevent dead-ends through clear mapping of visual layout order (`Tab`).
3. **Standard Audit:** Use `templates/REPORT.md` as "Definition of Done".

## 5. Reporting & Liability (VPAT Strategy)

- **VPAT Creation:** Maintain a technical document recording which WCAG criteria are fully or partially supported.
- **Traceability:** Each major feature must cite which WCAG criterion is being respected.

## 6. European Compliance (EN 301 549)

For EAA compliance:

- **Interoperability:** Ensure the software does not prevent use of third-party assistive technologies.
- **Accessibility Declaration:** Maintain a public accessibility page describing features and compliance level.

## 7. Compliance Versioning

Current focused standard: **WCAG 2.2 AA** | **EN 301 549**. Deviations due to severe limitations **MUST** be justified using `templates/EXCEPTIONS.md` with compensatory actions.

## 8. External Standards & Engines

- [WAI-ARIA APG](https://www.w3.org/WAI/ARIA/apg/)
- [eBay MIND Patterns](https://ebay.github.io/mindpatterns/)
- [Deque Axe Core](https://github.com/dequelabs/axe-core)
- [EN 301 549](https://www.etsi.org/deliver/etsi_en/301500_301599/301549/)
