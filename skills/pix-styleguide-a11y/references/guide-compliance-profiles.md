# Compliance Profiles Guide

> **Scope:** AI Generation & Auditing | **See also:** SKILL.md §0.1

Accessibility is not a monolith. While **WCAG 2.2 AA** is the industry and legal standard, different stages of a project demand different levels of rigor.

> **Normative vs House Rules.** Each profile mixes two layers:
> - **WCAG Success Criteria** at its target level (cited by SC number — skipping one requires `EXCEPTIONS.md`)
> - **House Rules†** — this standard's stricter ergonomic policy (marked †; relaxing one is a product decision recorded in `A11Y-DECISIONS.md`)
>
> WCAG defines **no minimum font size** at any level, and Level A defines **no contrast or target-size criteria** — every value in those positions below is a House Rule.

---

## The Profiles

| Profile | Target Standard | Primary Use Case | Focus |
| :--- | :--- | :--- | :--- |
| **🛡️ Shield (AAA)** | WCAG 2.2 AAA | Regulated industries, specialized software | Ultimate inclusivity, zero barriers |
| **⚖️ Standard (AA)** | WCAG 2.2 AA | Production web apps (**Default**) | Legal compliance, broad usability |
| **🚀 Launchpad (A)** | WCAG 2.2 A | MVPs, internal tools, prototypes | Absolute minimum baseline |

---

## 1. 🛡️ Shield Profile (AAA)

**When to use:** Government, healthcare, education, specialized audiences with severe disabilities.

**AI Instruction:** `"Apply Shield Profile (AAA)"`

### Key Requirements (Beyond AA)

- **Contrast (SC 1.4.6):** Text must have **7:1** ratio. Large text (18pt+) must have **4.5:1**. UI components at 3:1 (SC 1.4.11).
- **No Exceptions for Density:** Even tiny badges or labels must meet the 7:1 ratio.
- **Targets (SC 2.5.5):** Clickable elements must be at least **44×44px**. **House Rule†:** design to **48×48px** and allow no density exceptions.
- **Focus (SC 2.4.13 + House Rule†):** Highly visible focus indicator — solid 2px outline with 3:1 contrast against the background.
- **Timeouts:** Users must be able to complete tasks without arbitrary time limits.

---

## 2. ⚖️ Standard Profile (AA) — Default

**When to use:** **Default.** Production software, public-facing websites, commercial products.

**AI Instruction:** `"Apply Standard Profile (AA)"`

### Key Requirements

- **Contrast (SC 1.4.3, 1.4.11):** Text must have **4.5:1** ratio. Large text: **3:1**. UI elements: **3:1**.
- **Targets (SC 2.5.8):** At least **24×24px** (AA normative). **House Rule†:** design to **44×44px**.
- **Focus (SC 2.4.7):** Focus must be clearly visible.
- **Semantic HTML & ARIA:** Strict adherence to APG patterns.
- **Responsiveness (SC 1.4.4, 1.4.10):** Text resizes to 200%; reflow at 320 CSS px width.

---

## 3. 🚀 Launchpad Profile (A)

**When to use:** Rapid prototyping, internal admin panels, initial MVPs.

**AI Instruction:** `"Apply Launchpad Profile (A)"`

> Launchpad does **NOT** mean "no accessibility". It still requires semantic HTML, keyboard operability, and screen reader support. It only relaxes strict visual criteria.

### Relaxed Criteria (vs AA)

- **Contrast (House Rule†):** Baseline **3:1** ratio enforced. (Level A has no contrast criterion.)
- **Targets (House Rule†):** Can be reduced to **24×24px** with some spacing.
- **Typography (House Rule†):** Fonts down to **10px** tolerated.

### Immutable Rules (Never Relaxed, even under Launchpad)

- ❌ `div` or `span` with `onClick` (Keyboard trap/unreachable)
- ❌ Missing `alt` on critical images
- ❌ Missing `label` on form inputs
- ❌ Modal without focus trap
- ❌ Changes in state without `aria-live` or role alerts
