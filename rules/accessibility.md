# Accessibility Rules

## Scope

These rules apply to all frontend services (web and mobile). Accessibility (a11y) is a legal requirement under the **European Accessibility Act (EAA, Directive 2019/882)**, enforceable from June 28, 2025, and must be integrated into design, development, and QA workflows — not treated as an afterthought.

## Core principles

- Products must comply with the **EAA** and follow **WCAG 2.1 AA** standards. WCAG 2.1 AAA is recommended for critical use cases (e.g., healthcare, public services, enterprise clients).
- Use semantic HTML before introducing ARIA attributes.
- Accessibility validation starts early — at design stage, not just at release (shift-left).
- Combine automated testing (axe-core, Lighthouse) with manual validation (screen readers, keyboard navigation, contrast checks).

## WCAG 2.1 compliance levels

| Level              | Requirement                                     | Key thresholds                                                                               |
| ------------------ | ----------------------------------------------- | -------------------------------------------------------------------------------------------- |
| **A** (Minimum)    | Not sufficient for EAA compliance               | Basic keyboard nav, text alternatives                                                        |
| **AA** (Required)  | Mandatory baseline for all projects             | Color contrast ≥ 4.5:1, text resize to 200%, visible focus indicators, consistent navigation |
| **AAA** (Enhanced) | Recommended for high-accessibility environments | Color contrast ≥ 7:1, sign language for media, extended timeouts                             |

## Semantic HTML

- Always prefer native elements over ARIA workarounds:
  - ✅ `<button>` instead of `<div role="button">`
  - ✅ `<nav>` for navigation instead of generic containers
- Provide meaningful `alt` text for images: `alt="Product photo of X"`
- Use headings in hierarchical order: `<h1>` → `<h2>` → `<h3>`
- Ensure all form inputs have associated labels: `<label for="email">Email</label>`

## ARIA roles & attributes

Use ARIA only when native HTML is insufficient (e.g., custom UI components).

### Landmark roles

| Role                 | Usage             |
| -------------------- | ----------------- |
| `role="banner"`      | Page header       |
| `role="navigation"`  | Navigation menus  |
| `role="main"`        | Main content area |
| `role="contentinfo"` | Footer            |

### Interactive components

- ARIA states must reflect actual behavior: `aria-expanded`, `aria-pressed`, `aria-disabled`.
- All interactive elements must be accessible via `Tab` / `Shift+Tab`.

```html
<!-- ✅ Correct -->
<button aria-expanded="false" aria-controls="menu">Menu</button>
<ul id="menu" hidden>
  ...
</ul>

<!-- ❌ Wrong — no role, not keyboard accessible -->
<div onClick="openMenu()">Menu</div>
```

## Verification process

### Design stage

- Use accessibility-ready design tools (e.g., Figma plugins for contrast and color blindness simulation).
- Define color, typography, and spacing tokens that meet AA (and AAA where required) contrast ratios.

### Development stage

- Use semantic HTML and ARIA only when required.
- Validate against WCAG 2.1 AA checklists during implementation.
- Add automated accessibility tests with `axe-core` or `jest-axe`.

### Testing & QA stage

- Run Lighthouse accessibility audits.
- Validate with screen readers (NVDA, JAWS, VoiceOver, TalkBack).
- Perform keyboard-only navigation testing.
- Perform manual color contrast checks (AA/AAA ratios).

### CI/CD integration

- Block deployments if automated tests reveal critical WCAG AA violations.
- Generate accessibility reports per release cycle.

## Validation tools

- **axe-core** — automated validation in CI/CD. Integrates with Vitest, Cypress, and Playwright.
- **Lighthouse** (Chrome DevTools) — accessibility audits.
- **Wave** — manual WCAG verification tool.
- **Contrast Checker** (e.g., WebAIM) — AA/AAA color contrast compliance.
- **Screen readers**: NVDA (Windows), JAWS (Windows), VoiceOver (macOS/iOS), TalkBack (Android).
- Keyboard-only navigation testing is mandatory before release.

## European Accessibility Act (EAA)

- **Scope**: applies to digital services (websites, apps, e-commerce, online banking, etc.) sold in the EU.
- **Deadline**: mandatory compliance from June 28, 2025.
- **Standard**: EN 301 549, aligned with WCAG 2.1 AA.
- **Key requirements**: accessible UI and functionality, compatibility with assistive technologies, non-discrimination in accessing digital services.
- **Enforcement**: non-compliance can result in legal penalties, financial sanctions, and exclusion from EU markets.

## Development checklist

Before shipping any frontend feature, verify:

- [ ] Semantic HTML used wherever possible
- [ ] ARIA used only when necessary and correctly implemented
- [ ] All interactive components keyboard-navigable
- [ ] No color contrast violations (AA: ≥ 4.5:1; AAA: ≥ 7:1 where required)
- [ ] Text resizable to 200% without loss of content or functionality
- [ ] Visible focus indicators on all interactive elements
- [ ] Forms have proper labels, error messages, and instructions
- [ ] Media includes captions and transcripts (sign language for AAA)
- [ ] Tested with axe-core in development and CI/CD
- [ ] Validated with manual testing (screen readers, keyboard-only)
- [ ] Compliant with WCAG 2.1 AA and EAA requirements
