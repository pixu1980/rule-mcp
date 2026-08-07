# Exceptions Log

This document logs known deviations from accessibility standards (WCAG 2.2 AA / EN 301 549) that have been temporarily accepted.

> **Objective:** Provide technical and legal transparency by documenting _where_, _why_, and _how_ we temporarily mitigate guidelines that could not be met due to technical, platform, or scope limitations.

## Rules

1. An exception is **temporary** and does not change the requirement.
2. Every exception MUST have a **risk owner**, an **approver**, a **tracking issue**, and an **expiry date**.
3. Scope is the **narrowest practical**: one component/selector, never a whole rule.
4. At expiry, the exception is reviewed: fixed and removed, or consciously renewed. **Never silently suppressed.**
5. **AI duty:** in review mode, flag any exception past its expiry date as 🟠 HIGH technical debt.
6. This log is a **versioned project record** - never add it to `.gitignore`.

---

## Exception Log

### 1. Basic Details

- **Exception ID:** [e.g., EXT-2026-001]
- **Component / Page:** [e.g., Financial Dashboard Dynamic Table]
- **WCAG Guideline Affected:** [e.g., 2.1.1 Keyboard (A) and 1.4.3 Contrast (Minimum) (AA)]
- **Severity (User Impact):** [🔴 Critical | 🟠 High | 🟡 Medium | 🔵 Low]
- **Risk Owner:** [Who is accountable - a person, not a team]
- **Approved by:** [Lead/PO/QA]
- **Tracking Issue:** [Link to the backlog item]

### 2. Technical Blockade Description

- **What is broken?** [Explain what the user cannot do]
- **Why did it happen?** [Third-party tool, legacy architecture, etc.]

### 3. Workaround (Fallback / Remediation)

- **How can the user still complete the task?** [Text alternative, support option, etc.]

### 4. Resolution Plan and Expiry

- **Expiry (review-by date):** [YYYY-MM-DD - mandatory]
- **Resolution Criterion:** [What needs to happen for this exception to no longer exist?]

---

_Blank copy below for new exceptions:_

### 1. Basic Details

- **Exception ID:**
- **Component / Page:**
- **WCAG Guideline Affected:**
- **Severity:**
- **Risk Owner:**
- **Approved by:**
- **Tracking Issue:**

### 2. Technical Blockade Description

- **What is broken?**
- **Why did it happen?**

### 3. Workaround (Fallback / Remediation)

- **How can the user still complete the task?**

### 4. Resolution Plan and Expiry

- **Expiry (review-by date):**
- **Resolution Criterion:**
