---
name: rule-styleguide-a11y
description: >-
  WCAG 2.2 AA compliance framework integrating A11Y.md persistent context protocol.
  Covers AI Behavioral Contract, Compliance Profiles (Shield/Standard/Launchpad),
  severity model, POUR standards, semantic HTML, ARIA, keyboard navigation, color
  contrast, platform-native mapping, and Playwright + axe-core verification.
tags:
  - "accessibility"
  - "a11y"
  - "wcag"
  - "aria"
  - "playwright"
  - "axe-core"
  - "eaa"
  - "ada"
  - "en-301-549"
  - "compliance"
  - "vpats"
frameworks: [all]
---

# Accessibility Framework - WCAG 2.2 AA + A11Y.md Protocol

> **Based on:** [A11Y.md](https://github.com/fecarrico/A11Y.md) by Felipe A. Carriço - an accessibility validation protocol and persistent context architecture for developing certifiable software with AI.
>
> **See also:**
>
> - [`naming-and-file-tree.md`][rule-styleguide-naming](../rule-styleguide-naming/SKILL.md) for project structure
> - [`html.md`][rule-styleguide-html](../rule-styleguide-html/SKILL.md) for semantic HTML conventions
> - [`EAA.md`](./EAA.md) for the European Accessibility Act compliance checklist
> - [`references/`](./references/) for 21 actionable reference guides (WAI-ARIA APG patterns)
> - [`templates/`](./templates/) for decision log, exceptions log, and verification report

---

## 0. Principle Zero: Accessibility as Pre-condition

Accessibility is **not a feature** - it is a **pre-condition for use**.

- If a user cannot complete a task due to an accessibility barrier, the feature is considered **technically broken**.
- **Task Completion** success is our primary quality metric.
- Accessibility validation starts at design stage, not just at release (shift-left).

### 0.1. Compliance Profile

Select the appropriate profile before generating or reviewing interface code. If unspecified, **Standard (AA)** is the default.

| Profile              | Target   | Contrast (text / UI)           | Min Font† | Min Target                            | Use Case                                 |
| :------------------- | :------- | :----------------------------- | :-------- | :------------------------------------ | :--------------------------------------- |
| **🛡️ Shield (AAA)**  | WCAG AAA | 7:1 / 3:1 (SC 1.4.6, 1.4.11)   | 14px†     | 44x44px (SC 2.5.5) - 48x48px† advised | Regulated industries, healthcare, gov    |
| **⚖️ Standard (AA)** | WCAG AA  | 4.5:1 / 3:1 (SC 1.4.3, 1.4.11) | 12px†     | 24x24px (SC 2.5.8) - 44x44px† advised | **Default.** Production apps, public web |
| **🚀 Launchpad (A)** | WCAG A   | 3:1† (house floor)             | 10px†     | 24x24px†                              | MVPs, internal tools, prototypes         |

> **† House Rule:** non-normative - this framework's ergonomic policy where WCAG requires less or nothing at that level. WCAG defines no minimum font size at any level; Level A defines no contrast or target-size criteria; 44-48px targets come from Apple HIG / Material Design.
>
> **Skipping a WCAG SC** at your target level **MUST** be logged in `templates/EXCEPTIONS.md`. Relaxing a **House Rule** is a product decision - record it in `templates/A11Y-DECISIONS.md`.
>
> **Launchpad** additionally requires explicit `EXCEPTIONS.md` documentation for each criterion relaxed below AA.
>
> **Launchpad does NOT relax critical rules** (Section 1 Severity). Keyboard operability, focus management, and semantic HTML remain mandatory at **ALL** levels - these are Level A requirements.

### 0.2. Lazy Context Loading

- This `SKILL.md` is the **normative core** - sufficient for most code generation tasks.
- Reference files in `references/` **MUST NOT** be preloaded. They **MUST** be consulted only when the task explicitly involves that component type.
- For the authoritative upstream version of any reference, see: `https://github.com/fecarrico/A11Y.md/tree/main/docs/en/references/`

---

## 1. Severity & Impact Model

Evaluate the impact of any design or implementation decision:

| Severity        | Label                     | Definition                                                                                                                             | MUST?          |
| :-------------- | :------------------------ | :------------------------------------------------------------------------------------------------------------------------------------- | :------------- |
| 🔴 **CRITICAL** | Operation                 | Blocks **Task Completion** or renders function unusable (broken keyboard nav, clickable div/span, modal without focus management)      | **MUST FIX**   |
| 🟠 **HIGH**     | Perception & Readability  | Significantly increases **Error or Abandonment Rate** (insufficient contrast, fonts < 12px in critical text, lack of dynamic feedback) | **MUST FIX**   |
| 🟡 **MEDIUM**   | Efficiency & Satisfaction | Reduces efficiency (lack of optional keyboard shortcuts, lack of redundant labels)                                                     | **SHOULD FIX** |
| 🔵 **LOW**      | Cosmetic / Polish         | Minor improvements (micro-interactions without aria-labels, focus indicator enhancements)                                              | **MAY FIX**    |

---

## 2. AI Behavioral Contract

To ensure technical integrity, any agent interacting with this framework **MUST** follow these rules:

1. **No Inference:** Never infer accessibility without direct evidence in the code or specification.
2. **Lazy Context Loading:** Reference files (`references/`) MUST NOT be preloaded - consult only when the task explicitly involves that component type.
3. **Reference APG:** Prioritize patterns from the [WAI-ARIA Authoring Practices Guide (APG)](https://www.w3.org/WAI/ARIA/apg/).
4. **Protocol for Ambiguity:** Follow the _Complex Component Protocol_ (Section 6) in case of uncertainty.
5. **Explain Trade-offs:** Explain impacts on Accessibility vs UX vs Business when suggesting changes.
6. **UI Component Interrogation:** Before adding `onClick` to non-semantic elements, **MUST** propose replacing them with native elements or full ARIA patterns.
7. **Framework Adaptation:** This guide uses React/TSX syntax. On **web** frameworks, transpose patterns to the active framework while preserving semantic equivalence. See [`references/guide-framework-mapping.md`](./references/guide-framework-mapping.md).
8. **Platform Awareness:** Identify the target platform **before** loading any reference. The normative layer (Principle Zero, POUR, profiles, severity, governance) is platform-agnostic; technical references are web-first. On native platforms (iOS, Android, React Native, Flutter), web references are **semantic intent to translate - never implementation to copy**. See [`references/guide-platform-native.md`](./references/guide-platform-native.md).
9. **Component Reuse:** Before generating any interactive component, check for an existing implementation in the project or its design system and extend it. Generating a parallel implementation of an existing pattern is a violation.
10. **Decision Memory:** Choices between equally conformant alternatives MUST be recorded in `templates/A11Y-DECISIONS.md` - indexed by pattern, never by screen - and reused in later turns.
11. **Mode Awareness:** When generating new code, apply all rules proactively. When reviewing existing code, identify violations, classify by severity (Section 1), and suggest targeted fixes - do not propose full rewrites unless the structural damage is CRITICAL. If `templates/EXCEPTIONS.md` exists, consult it: an entry there is a legitimate dispensation, but an entry past its expiry date MUST be flagged as 🟠 HIGH technical debt.

---

## 3. Technical Standards (POUR Framework)

### 3.1 Perceivable

**References:** [`references/guide-images.md`](./references/guide-images.md) | [`references/guide-content-interaction.md`](./references/guide-content-interaction.md) | [`references/guide-visual-perception.md`](./references/guide-visual-perception.md) | [`references/guide-responsive-mobile.md`](./references/guide-responsive-mobile.md)

- **Contrast (SC 1.4.3, 1.4.11):** Text **MUST** have 4.5:1; UI components and meaningful graphics **MUST** have 3:1. Prioritize real **luminance difference** (light vs dark) beyond hue.
- **Alt Text (SC 1.1.1):** Informative images **MUST** have a functional description in `alt`.
- **Semantic Redundancy:** **MUST NOT** convey state using color alone. **Icon + Text + Color** (e.g., 🔴 Error) is the mandatory standard.
- **Visual Patterns:** Charts and dashboards **MUST** use textures or distinct line styles to ensure differentiation without color.

### 3.2 Operable

**References:** [`references/guide-buttons.md`](./references/guide-buttons.md) | [`references/guide-modals.md`](./references/guide-modals.md) | [`references/guide-navigation.md`](./references/guide-navigation.md) | [`references/guide-tabs-accordion.md`](./references/guide-tabs-accordion.md) | [`references/guide-carousels-sliders.md`](./references/guide-carousels-sliders.md) | [`references/guide-drag-drop.md`](./references/guide-drag-drop.md) | [`references/guide-autocomplete.md`](./references/guide-autocomplete.md) | [`references/guide-infinite-scroll.md`](./references/guide-infinite-scroll.md)

- **Keyboard (SC 2.1.1):** 100% of functionalities **MUST** be operable without a mouse. Avoid purely pointer-based listeners without keyboard event equivalents.
- **Focus (SC 2.4.7, 2.4.11):** Focus **MUST** be visible, never entirely obscured by author content (e.g., sticky headers/footers), persistent, and never suppressed via CSS (`outline: none` without fallback is forbidden).
- **SPA Routing (Single Page Applications):** After client-side routing changes, focus **MUST** be managed and properly reset (e.g., sending focus to the top or an H1).
- **Targets (SC 2.5.8):** Interactive elements MUST have a minimum size of **24x24 CSS pixels** - the WCAG 2.2 AA floor. **House Rule†:** design to **44x44px** (48x48 under Shield), the ergonomic floor shared by Apple HIG and Material Design.
- **Motion (SC 2.3.3 AAA - enforced as House Rule† at every profile):** **MUST** respect `@media (prefers-reduced-motion)`.

### 3.3 Understandable

**References:** [`references/guide-forms.md`](./references/guide-forms.md) | [`references/guide-content-interaction.md`](./references/guide-content-interaction.md) | [`references/guide-tables.md`](./references/guide-tables.md) | [`references/guide-toasts-notifications.md`](./references/guide-toasts-notifications.md) | [`references/guide-loading-skeleton.md`](./references/guide-loading-skeleton.md) | [`references/guide-tooltips-popovers.md`](./references/guide-tooltips-popovers.md)

- **Labels (SC 1.3.1, 3.3.2):** Forms **MUST** have explicit labels connected via `id` and `for`, or via tag wrapping.
- **Predictability:** Navigation behavior **MUST** be consistent and interactions must not cause unannounced sudden structural changes.
- **Dynamic Feedback (SC 4.1.3):** Dynamic events (toasts, loading, AJAX/fetch successes) **MUST** be actively read or informed through `aria-live` regions or modern equivalents (`role="status"`, `role="alert"`).

### 3.4 Robust

**References:** [`references/guide-governance.md`](./references/guide-governance.md) | [`references/guide-framework-mapping.md`](./references/guide-framework-mapping.md) | [`references/guide-platform-native.md`](./references/guide-platform-native.md)

- **Semantic HTML:** **MUST** prefer native (HTML5) elements over custom ones.
- **Interoperability:** The code **MUST** be compatible with current assistive technologies (ISO 9241-171).

---

## 4. Semantic HTML (Mandatory)

Semantic HTML is the foundation of accessibility. **Do not use `<div>` or `<span>` for layout containers when a semantic element exists.**

### Decision table

| Element                      | When to use                                                             | Never use `<div>` when                        |
| ---------------------------- | ----------------------------------------------------------------------- | --------------------------------------------- |
| `<header>`                   | Introductory content, heading group, site header, search bar            | Content is at the top of a section/page       |
| `<main>`                     | Primary content unique to this page                                     | One per document                              |
| `<footer>`                   | Metadata, copyright, related links for its parent                       | Content is at the bottom of a section/page    |
| `<nav>`                      | Navigation links for the page or section                                | Links form a navigation menu                  |
| `<article>`                  | Self-contained, independently distributable content                     | Content makes sense on its own                |
| `<section>`                  | Thematic grouping of content, usually with a heading                    | Content is a distinct part of a larger whole  |
| `<aside>`                    | Content tangentially related to the main content (sidebar, pullquote)   | Content complements but is not essential      |
| `<figure>` + `<figcaption>`  | Self-contained media (image, diagram, code block) with optional caption | Media needs a caption                         |
| `<button>`                   | Action triggering a state change (submit, close, toggle)                | An element is clickable and does not navigate |
| `<label>`                    | Describing a form control                                               | A form input needs a descriptive label        |
| `<form>`                     | A group of interactive controls for submitting data                     | Inputs collect and submit data                |
| `<table>`                    | Tabular data with rows and columns                                      | Data requires row/column relationships        |
| `<table>` for calendar grids | A month/week calendar **is** tabular data (days x weeks)                | A grid of days/weeks is rendered              |

### Example: semantic vs non-semantic

```html
<!-- ❌ VIOLATION: generic divs for everything -->
<div class="card">
  <div class="card-title">Title</div>
  <div class="card-body">Content</div>
</div>

<!-- ✅ CORRECT: semantic elements -->
<article>
  <h2>Title</h2>
  <p>Content</p>
</article>
```

```html
<!-- ❌ VIOLATION: div as clickable -->
<div class="btn" onclick="submit()">Submit</div>

<!-- ✅ CORRECT: native button -->
<button type="submit">Submit</button>
```

### Landmarks

Every page must have at least these landmarks:

```html
<body>
  <header>
    <nav>...</nav>
    <!-- Site navigation -->
  </header>
  <main>
    <article>...</article>
    <!-- Primary content or listing -->
  </main>
  <footer>...</footer>
</body>
```

### Calendar Grids - Use `<table>`

A month or week calendar **is tabular data**: it represents days (columns) x weeks (rows).

```html
<!-- ✅ CORRECT: semantic <table> for calendar grid -->
<table aria-label="June 2026">
  <thead>
    <tr>
      <th scope="col" abbr="Monday">M</th>
      <th scope="col" abbr="Tuesday">T</th>
      <!-- … -->
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><span>1</span></td>
      <td><span>2</span></td>
      <!-- … -->
    </tr>
  </tbody>
</table>
```

Benefits: No ARIA role conflicts, built-in screen reader semantics, `table-layout: fixed` for uniform widths, `border-collapse: collapse` for clean borders.

---

## 5. Visual Directives (Strict UI Criteria)

- **Focus Indicator (House Rule† - inspired by SC 2.4.13 AAA):** The focus ring **MUST** have a minimum thickness of 2px and a contrast of at least 3:1 against the background.
- **Typography (House Rule†):** Text **MUST NOT** be smaller than the minimum font size of the active Compliance Profile (Section 0.1); 12px under default Standard (AA).
  - **Density Exception:** In complex dashboards or secondary metadata (badges), **min 10px** is allowed, provided the contrast is raised to **7:1** as mitigation - documented in `templates/EXCEPTIONS.md`.
- **Target Spacing & Hit Area:** See _Section 3.2 - Targets_. In dense UIs, if visual size < 44px, the **hit area** MUST be expanded via CSS/padding. Adjacent targets **SHOULD** have 8px of spacing.

### 5.1 Color and Contrast

- **Text**: minimum contrast ratio of **4.5:1** (AA normal text), **3:1** for large text (>=18px bold or >=24px).
- **Non-text**: UI components and graphical objects must have at least **3:1** contrast against adjacent colors.
- Do not use color alone to convey information. Add icons, underlines, or text labels.

```css
/* ✅ CORRECT: color + underline for links */
a {
  color: #1a73e8;
  text-decoration: underline;
}

/* ❌ VIOLATION: color-only distinction */
.error {
  color: red;
}
.success {
  color: green;
}
```

- Focus indicators must have at least **3:1** contrast ratio against the focused element's background.

### 5.2 OKLCH Color Model & APCA

Prefer the **OKLCH** color space (Luminance, Chroma, Hue) for perceptually uniform contrast.

- **Delta E (ΔE):** Measure of distance between two colors.
  - ΔE > 20: Noticeable difference for most users.
  - ΔE > 40: High-security difference for colorblind users.
- **APCA** (Advanced Perceptual Contrast Algorithm): Future standard (WCAG 3). Aim for **Lc (Lightness Contrast) >= 60** for body text.

### 5.3 Visual Redundancy for Charts

Charts and dashboards **MUST NOT** rely exclusively on colors to differentiate data series:

- **Lines:** Use dashed, dotted, and different thicknesses.
- **Markers:** Use distinct shapes (circles, triangles, squares).
- **Areas:** Use textures/hatch patterns instead of adjacent solid colors.
- **Guideline:** If printed in black and white, the chart must still be interpretable.

---

## 6. Complex Component Protocol

When identifying an unmapped or highly complex component:

1. **Identify:** Look for a similar pattern in the [WAI-ARIA APG](https://www.w3.org/WAI/ARIA/apg/).
2. **Validate:** Request human validation with a screen reader - the AI **MUST NOT** claim this test was performed, nor fabricate its results.
3. **Document:** Document expected behavior (keyboard and announcements).
4. **Scale:** Record the resolved pattern in `templates/A11Y-DECISIONS.md` so future components reuse it instead of re-deriving it.

---

## 7. Anti-patterns (Do NOT do this)

- **Clickable Divs:** **MUST NOT** use `div` or `span` for click actions. Prefer native buttons. If forced, manually replicate `<button>` behavior (`role`, `tabindex="0"`, Enter and Space listeners).
- **Leaked Focus Traps:** **MUST NOT** create modals without managing focus. When a modal is open:
  - Focus MUST move into the modal
  - Focus MUST be trapped within the modal
  - Focus MUST return to the triggering element when closed
  - Background content MUST NOT be interactive or reachable via keyboard
- **Placeholder Labels:** **MUST NOT** use `placeholder` as the sole form of label. Crucial instructions MUST be visible outside the field.
- **ARIA Soup:** **MUST NOT** add ARIA where native HTML already provides the semantics. No ARIA is better than bad ARIA. Forbidden by default: redundant roles (`role="button"` on `<button>`), `aria-label` duplicating visible text, static never-updated ARIA states.
- **Reinventing the Wheel:** Use robust accessible libraries (Headless UI) rather than building proprietary complex components from scratch.

---

## 8. Verification Workflow (Definition of Done)

Compliance must be verified through these steps:

- [ ] **Technical Check:** Clean code, testable via integrated linter (`eslint-plugin-jsx-a11y` or similar), passing without critical violations through engines like **axe-core**.
- [ ] **Tab Order:** `Tab` key path manually validated (ensures absence of frontend dead-ends).
- [ ] **User Flow:** Dynamic interactions (SPAs) tested for feedback via `aria-live` in error and success scenarios without mouse use.
- [ ] **Zoom & Reflow:** Text resizes up to 200% without loss of content or function (SC 1.4.4); content reflows at 320 CSS px width - equivalent to 400% zoom on a 1280px viewport - without two-dimensional scrolling (SC 1.4.10).
- [ ] **Color & Perception:** No functional loss when losing the exclusive use of colors (vision deficiency simulators).
- [ ] **Exceptions Audit:** `templates/EXCEPTIONS.md` reviewed - every active entry has a risk owner, approver, tracking issue and expiry; no expired entries left unaddressed.
- [ ] **Screen Reader:** Manual validation with NVDA (Windows), VoiceOver (macOS/iOS), or TalkBack (Android) - the AI MUST NOT claim it performed this test.
- [ ] **EAA Compliance:** For EU-market products, verify compliance with EN 301 549 (see [`EAA.md`](./EAA.md)).

### CI/CD Integration

- Block deployments if automated tests reveal critical WCAG AA violations.
- Generate accessibility reports per release cycle.

---

## 9. WCAG-EM evaluation methodology and the conformance report

A conformance claim is a claim someone may have to defend. What makes one
defensible is not the number of things checked; it is that every criterion in
the target is accounted for and that anything unchecked says so.

WCAG-EM is the W3C methodology for exactly that. Five steps, and skipping any of
them produces a result that cannot be reproduced or disputed:

| Step                              | What it fixes                                                             |
| --------------------------------- | ------------------------------------------------------------------------- |
| 1. Define the evaluation scope    | Which pages, which conformance level, which technologies and user agents  |
| 2. Explore the target             | Common pages, functionality, content types, technologies relied upon      |
| 3. Select a representative sample | A structured sample plus a random one, with the reason each page is in it |
| 4. Audit the sample               | One outcome per criterion per page, with the evidence behind it           |
| 5. Report the findings            | Scope, sample, outcomes, and the claim they actually support              |

Results use the five EARL outcomes, and they are not interchangeable:
`passed`, `failed`, `cantTell` (checked, undecidable without more information),
`inapplicable` (the content this criterion governs is absent), `untested`.
Reporting `inapplicable` where you mean `untested` is how a claim becomes wrong.

### Building the report

`rule_tool_a11y_report` turns per-criterion outcomes into a WCAG-EM structured
report plus EARL JSON-LD. It is deterministic: no model, no network.

```
rule_tool_a11y_report
  scope:   { title: "Checkout flow", url: "https://example.com/checkout", level: "AA" }
  sample:  ["/checkout", "/checkout/payment", "/checkout/confirmation"]
  results: [{ criterion: "1.1.1", outcome: "failed", note: "Product images have no alt", location: "img.product" },
            { criterion: "1.4.3", outcome: "passed" },
            { criterion: "1.2.2", outcome: "inapplicable", note: "No prerecorded media" }]
```

Three behaviors are deliberate:

- **Every criterion in the target appears.** Level AA means 55 criteria, not the
  ones you remembered. Whatever you did not report comes back as `untested`.
- **An unknown criterion or outcome is an error**, never a silent skip. A typo
  that drops a row would claim coverage the audit does not have.
- **Any failure, cantTell or untested blocks the claim.** "Mostly conforms" is
  not a conformance level.

The criteria are vendored from the W3C's published WCAG 2.2 data, so the answer
does not depend on the network. Refresh them with `rule-mcp a11y-update`.

### What the guardrails cover, and what they cannot

`rule_tool_check` runs the regex-decidable subset against markup and styles, and
each failure names the criterion rather than only the fix:

| Guardrail                    | Criterion                    |
| ---------------------------- | ---------------------------- |
| `a11y-img-alt`               | 1.1.1 Non-text Content       |
| `a11y-video-captions`        | 1.2.2 Captions (Prerecorded) |
| `a11y-no-autoplay`           | 1.4.2 Audio Control          |
| `a11y-positive-tabindex`     | 2.4.3 Focus Order            |
| `a11y-focus-visible`         | 2.4.11 Focus Appearance      |
| `a11y-html-lang`             | 3.1.1 Language of Page       |
| `a11y-form-label`            | 3.3.2 Labels or Instructions |
| `a11y-iframe-title`          | 4.1.2 Name, Role, Value      |
| `a11y-aria-hidden-focusable` | 4.1.2 Name, Role, Value      |

**These are a floor, not an audit.** A clean run means no machine-detectable
violation of nine criteria out of 55. Contrast ratios need rendering; whether
alt text is meaningful, whether focus order matches reading order, and whether
an error message actually helps all need a person. A tool that claimed otherwise
would be the most expensive kind of false confidence.

## 10. Reference & Templates Library

### Technical Guides (21 references)

These files in `references/` are **lazy-loaded** - read only the guide relevant to the component type you are building.

| Guide                         | Component Type             | File                                                                                     |
| :---------------------------- | :------------------------- | :--------------------------------------------------------------------------------------- |
| Autocomplete & Combobox       | Search & Selects           | [`references/guide-autocomplete.md`](./references/guide-autocomplete.md)                 |
| Buttons & Actions             | Buttons                    | [`references/guide-buttons.md`](./references/guide-buttons.md)                           |
| Carousels & Sliders           | Sliding Content            | [`references/guide-carousels-sliders.md`](./references/guide-carousels-sliders.md)       |
| Compliance Profiles           | AI Generation & Auditing   | [`references/guide-compliance-profiles.md`](./references/guide-compliance-profiles.md)   |
| Content, Interaction & Timing | Microcopy & Timeouts       | [`references/guide-content-interaction.md`](./references/guide-content-interaction.md)   |
| Drag & Drop                   | Interactive Lists & Boards | [`references/guide-drag-drop.md`](./references/guide-drag-drop.md)                       |
| Forms                         | Forms & Errors             | [`references/guide-forms.md`](./references/guide-forms.md)                               |
| Framework Mapping             | AI Code Generation         | [`references/guide-framework-mapping.md`](./references/guide-framework-mapping.md)       |
| Governance & Compliance       | VPAT & Audit Readiness     | [`references/guide-governance.md`](./references/guide-governance.md)                     |
| Images & Alt Text             | Images                     | [`references/guide-images.md`](./references/guide-images.md)                             |
| Infinite Scroll               | Pagination & Feeds         | [`references/guide-infinite-scroll.md`](./references/guide-infinite-scroll.md)           |
| Loading & Skeletons           | Loading States             | [`references/guide-loading-skeleton.md`](./references/guide-loading-skeleton.md)         |
| Modals & Dialogs              | Modals                     | [`references/guide-modals.md`](./references/guide-modals.md)                             |
| Navigation                    | Navigation                 | [`references/guide-navigation.md`](./references/guide-navigation.md)                     |
| Platform-Native Mapping       | iOS, Android, RN, Flutter  | [`references/guide-platform-native.md`](./references/guide-platform-native.md)           |
| Responsive & Zoom             | Web Layout & Zoom          | [`references/guide-responsive-mobile.md`](./references/guide-responsive-mobile.md)       |
| Tables                        | Data Grids & Tables        | [`references/guide-tables.md`](./references/guide-tables.md)                             |
| Tabs & Accordions             | Content Disclosure         | [`references/guide-tabs-accordion.md`](./references/guide-tabs-accordion.md)             |
| Toasts & Notifications        | Dynamic Feedback           | [`references/guide-toasts-notifications.md`](./references/guide-toasts-notifications.md) |
| Tooltips & Popovers           | Contextual Information     | [`references/guide-tooltips-popovers.md`](./references/guide-tooltips-popovers.md)       |
| Visual Perception & Color     | Color & Contrast           | [`references/guide-visual-perception.md`](./references/guide-visual-perception.md)       |

### Templates

| Template            | Purpose                              | File                                                           |
| :------------------ | :----------------------------------- | :------------------------------------------------------------- |
| Decisions Log       | Cross-turn memory of pattern choices | [`templates/A11Y-DECISIONS.md`](./templates/A11Y-DECISIONS.md) |
| Exceptions Log      | Documented deviations from standards | [`templates/EXCEPTIONS.md`](./templates/EXCEPTIONS.md)         |
| Verification Report | Compliance evidence for a feature    | [`templates/REPORT.md`](./templates/REPORT.md)                 |

### External Standards

- [WAI-ARIA Authoring Practices Guide (APG)](https://www.w3.org/WAI/ARIA/apg/)
- [eBay MIND Patterns](https://ebay.github.io/mindpatterns/)
- [Deque Axe Core](https://github.com/dequelabs/axe-core)
- [European Accessibility Act (EAA)](./EAA.md)

---

## 11. Setup Guide: Integration with AI Agents

To use this framework with any AI coding agent, add **one rule** to your agent's configuration file:

| Environment        | Configuration File                | Rule                                                                                                                                         |
| :----------------- | :-------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------- |
| **Cursor**         | `.cursor/rules/a11y.mdc`          | `--- description: "Accessibility context" alwaysApply: true ---` + `Follow strictly the accessibility rules defined in rule-styleguide-a11y.` |
| **Claude Code**    | `CLAUDE.md` (root)                | `## Accessibility` + `Follow the accessibility rules in the rule-styleguide-a11y skill.`                                                      |
| **GitHub Copilot** | `.github/copilot-instructions.md` | Same format                                                                                                                                  |
| **Windsurf**       | `.windsurf/rules/a11y.md`         | Same format                                                                                                                                  |

> **Do not duplicate** accessibility rules outside this skill - prevents rule fragmentation and ensures the AI always loads the complete context.

---

## Conventions (rules -> skills merge)

# Accessibility Rules

## Scope

These rules apply to all frontend services (web and mobile). Accessibility (a11y) is a legal requirement under the **European Accessibility Act (EAA, Directive 2019/882)**, enforceable from June 28, 2025, and must be integrated into design, development, and QA workflows - not treated as an afterthought.

## Core principles

- Products must comply with the **EAA** and follow **WCAG 2.1 AA** standards. WCAG 2.1 AAA is recommended for critical use cases (e.g., healthcare, public services, enterprise clients).
- Use semantic HTML before introducing ARIA attributes.
- Accessibility validation starts early - at design stage, not just at release (shift-left).
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

<!-- ❌ Wrong - no role, not keyboard accessible -->
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

- **axe-core** - automated validation in CI/CD. Integrates with Vitest, Cypress, and Playwright.
- **Lighthouse** (Chrome DevTools) - accessibility audits.
- **Wave** - manual WCAG verification tool.
- **Contrast Checker** (e.g., WebAIM) - AA/AAA color contrast compliance.
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

## See also

- [rule](../rule/SKILL.md) - Central skill index and dispatcher
- [rule-frontend](../rule-frontend/SKILL.md) - Frontend framework skills (a11y applies to all UI work)
- [rule-styleguide-html](../rule-styleguide-html/SKILL.md) - Semantic HTML conventions
- [rule-ui-design-system](../rule-ui-design-system/SKILL.md) - UI design system and accessibility direction
