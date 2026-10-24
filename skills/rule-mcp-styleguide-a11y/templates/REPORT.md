# Verification Report (Template)

This report compiles the compliance evidence for a given _Feature_, ensuring its development reached the "Certification Ready" definition.

> This report is a **versioned project record** - never add it to `.gitignore`. Evidence hidden from version control is not evidence.

---

## Validation Context

- **Feature/Epic:** [e.g., Integrated Checkout]
- **Test Date:** [MM/DD/YYYY]
- **Compliance Status:** [✅ PASS | ⚠️ CONDITIONAL | 🚫 FAIL]
- **Compliance Profile:** [🛡️ Shield (AAA) | ⚖️ Standard (AA) | 🚀 Launchpad (A)]

## 1. Technical Verification (Automated & Semantics)

- [ ] **Axe-Core / Lighthouse:** Zero "Critical" or "Serious" violations? (Score: ___)
- [ ] **HTML Semantics:** Appropriate native elements used instead of generic divs?
- [ ] **Heading Hierarchy (H1-H6):** Respected with no level skips?

## 2. Tab Order and Focus Management

- [ ] **Focus Indicator:** Never suppressed, meets minimum 3:1 contrast?
- [ ] **Logical Navigation:** Tab key follows correct visual order?
- [ ] **Captured Focus (Modals/Overlays):** Focus trapped inside, closes via Escape?

## 3. Behavior and Task Completion

- [ ] **Screen Reader Test:** Main task performed using VoiceOver/NVDA/TalkBack?
- [ ] **Status Change (`aria-live`):** Errors, loading states, dynamic updates correctly announced?
- [ ] **Form Filling:** Correctly related labels (`for` and `id`) in all inputs?

## 4. Visual Perception and Comprehension

- [ ] **Text & UI Contrast:** All texts >= 4.5:1 and essential components >= 3:1?
- [ ] **Redundancy:** Errors and alerts use Color + Icon + Text (never color alone)?
- [ ] **Scale / Zoom:** Text resized to 200% without loss (SC 1.4.4)? Content reflowed at 320 CSS px (SC 1.4.10)?

---

## Assessment Notes or Known Blockers

_Describe exceptions or measures documented in `EXCEPTIONS.md`_

- **Note 1:**
- **Note 2:**
