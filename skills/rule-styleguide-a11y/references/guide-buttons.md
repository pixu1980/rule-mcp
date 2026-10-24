# Buttons & Actions Guide

> **Scope:** Semantic button usage, ARIA patterns, keyboard interactions | **WCAG:** 2.1.1, 2.4.4, 2.5.8, 4.1.2

## Core Rules

1. **Native `<button>`:** Always use `<button>` for actions. Built-in keyboard (Enter/Space) and screen reader semantics.
2. **Icon buttons:** MUST have `aria-label` when text is absent.
3. **Vague labels forbidden:** "Click Here", "Learn More" - screen reader users list buttons to navigate. Use descriptive labels ("Download Report").
4. **Links vs Buttons:** Use `<a>` for navigation, `<button>` for actions.

## Good Examples

```html
<!-- Native button -->
<button type="button" class="btn-primary">Submit Application</button>

<!-- Icon button with label -->
<button aria-label="Close modal">
  <svg aria-hidden="true" focusable="false">...</svg>
</button>

<!-- Toggle button -->
<button aria-pressed="false">Mute notifications</button>
```

## Bad Examples

```html
<!-- ❌ Clickable div - invisible to keyboard and screen readers -->
<div onclick="submit()" class="my-button">Submit</div>

<!-- ❌ Vague label -->
<button>Click Here</button>

<!-- ❌ div as link - no focus, no link role -->
<span onclick="window.location='/new-page'">Go to Page</span>
```

## Accessibility Implications

- **Affordance:** Visually distinctive buttons help users with cognitive impairments identify interaction points.
- **Precision:** Design tap targets to **44x44px** (House Rule - Apple HIG/Material; WCAG AA floor is 24x24, SC 2.5.8).
