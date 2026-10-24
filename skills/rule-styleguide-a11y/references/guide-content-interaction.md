# Content, Interaction & Timing Guide

> **Scope:** Microcopy, timeout management, aria-live feedback, multimedia | **WCAG:** 1.2.2, 1.2.4, 1.4.1, 2.2.1, 2.2.2, 3.3.2, 4.1.3

## 1. Microcopy & Clarity

Language should be as simple as possible to reduce cognitive load.

- **Clear Instructions:** Avoid jargon. Use action verbs ("Submit" instead of "Process").
- **Field Identification:** Instructions about formats (e.g., "DD/MM/YYYY") must be outside the input and linked via `aria-describedby`.
- **Heading Content:** The text of headings must clearly describe the section that follows.

## 2. Timing Management (Timeouts)

- **Do Not Remove Time Without Warning:** If a session is going to expire, the user **MUST** be warned in advance and have the option to extend.
- **Moving Content:** Carousels or self-updating content **MUST** have a "Pause" button.

## 3. System Feedback & Status Messages (Aria-live)

| Type     | Region                                    | Use Case                                         |
| :------- | :---------------------------------------- | :----------------------------------------------- |
| Status   | `aria-live="polite"` or `role="status"`   | "Item added to cart", non-critical notifications |
| Critical | `aria-live="assertive"` or `role="alert"` | Errors preventing immediate progress             |
| Progress | `role="progressbar"` + `aria-valuenow`    | Loading indicators with percentage               |

```html
<!-- Status update -->
<div aria-live="polite" role="status">Item added to cart</div>

<!-- Critical error -->
<div role="alert">Form submission failed. Please correct errors below.</div>

<!-- Progress -->
<div role="progressbar" aria-valuenow="60" aria-valuemin="0" aria-valuemax="100">60% complete</div>
```

## 4. Sensory and Multimedia

- **Sensory Language:** **MUST NOT** give instructions based solely on senses ("Click the round button on the right"). Use text/context references.
- **Captions and Transcripts:** Audio and video **MUST** have text alternatives or synchronized captions.

## 5. Tip for Content AI

When generating text for the interface, validate: _"If I couldn't see the screen, would this instruction still make sense?"_
