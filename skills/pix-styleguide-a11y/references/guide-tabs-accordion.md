# Tabs & Accordions Guide

> **Scope:** Content Disclosure | **WCAG:** 1.3.1, 2.1.1, 2.4.3, 4.1.2

## Core Rules (Tabs)

1. **Keyboard:** Use arrow keys to navigate tabs; Tab key moves into/out of tab panel.
2. **Roles:** `role="tablist"`, `role="tab"`, `role="tabpanel"`.
3. **Aria-selected:** Used on tabs to denote the active tab.
4. **Aria-controls:** Tab references its panel via `aria-controls`.
5. **Tabpanel:** The active panel MUST have `tabindex="0"` if it contains focusable content.

## Core Rules (Accordions)

1. Use `<details>` and `<summary>` for simple accordions.
2. For custom accordions, use buttons with `aria-expanded` and `aria-controls`.

## Example: Tabs

```html
<div role="tablist" aria-label="Documentation">
  <button role="tab" aria-selected="true" aria-controls="panel-1" id="tab-1" tabindex="0">
    Overview
  </button>
  <button role="tab" aria-selected="false" aria-controls="panel-2" id="tab-2" tabindex="-1">
    Details
  </button>
</div>
<div role="tabpanel" id="panel-1" aria-labelledby="tab-1">
  <h2>Overview content</h2>
</div>
<div role="tabpanel" id="panel-2" aria-labelledby="tab-2" hidden>
  <h2>Details content</h2>
</div>
```

## Example: Accordion (Native)

```html
<details>
  <summary>Section 1</summary>
  <p>Content for section 1...</p>
</details>
<details>
  <summary>Section 2</summary>
  <p>Content for section 2...</p>
</details>
```

## Keyboard interactions (Tabs)

| Key | Action |
| :--- | :--- |
| Left/Right Arrow | Switch between tabs |
| Tab | Move from tablist into active tabpanel |
| Home | Go to first tab |
| End | Go to last tab |

## Keyboard interactions (Accordion)

| Key | Action |
| :--- | :--- |
| Enter / Space | Toggle accordion section |
| Tab | Move to next focusable element |
