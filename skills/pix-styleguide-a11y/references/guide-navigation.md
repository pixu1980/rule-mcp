# Navigation Guide

> **Scope:** Keyboard navigation patterns, skip links, landmark regions, SPA routing | **WCAG:** 1.3.1, 2.1.1, 2.4.1, 2.4.3, 2.4.5, 2.4.8, 4.1.2

## Core Rules

1. **Semantic `<nav>`:** Use `<nav>` as a landmark for navigation regions.
2. **`aria-current`:** Use on the current page link (`aria-current="page"`).
3. **Skip Links:** Every page MUST have a "Skip to main content" link as the first focusable element.
4. **Nested menus:** Must not rely on hover only — require JS to toggle on click/focus.
5. **SPA Routing:** Focus MUST be managed after route changes — send focus to the top or the new H1.
6. **Predictability:** Navigation order and location MUST be consistent across pages.

## Good Examples

```html
<!-- Semantic navigation with current page -->
<nav aria-label="Main Navigation">
  <ul>
    <li><a href="/" aria-current="page">Home</a></li>
    <li><a href="/about">About</a></li>
    <li><a href="/contact">Contact</a></li>
  </ul>
</nav>

<!-- Skip to content -->
<a href="#main-content" class="skip-link">Skip to main content</a>
...
<main id="main-content">...</main>

<!-- Breadcrumb -->
<nav aria-label="Breadcrumb">
  <ol>
    <li><a href="/">Home</a></li>
    <li><a href="/products">Products</a></li>
    <li aria-current="page">Current Page</li>
  </ol>
</nav>
```

## Bad Examples

```html
<!-- ❌ Hover-only menu — inaccessible to keyboard users -->
<li onmouseover="showMenu()">Products</li>

<!-- ❌ Non-standard link -->
<span onclick="window.location='/new-page'">Go to Page</span>

<!-- ❌ No skip link — keyboard users must Tab through all navigation -->
```

## SPA Routing Focus Management

```javascript
// After route change:
function handleRouteChange() {
  // Option A: Focus the main content area
  document.getElementById('main-content').focus();

  // Option B: Focus the page heading
  document.querySelector('h1').focus();

  // Announce navigation
  document.getElementById('route-announcer').textContent = 'Navigated to ' + pageTitle;
}
```

```html
<!-- Route announcer (always present, visually hidden) -->
<div aria-live="polite" role="status" id="route-announcer" class="sr-only"></div>
```

## Accessibility Implications

- **Searchability:** Navigation landmarks allow screen reader users to jump directly to navigation.
- **Predictability:** Keeping navigation in the same place across pages reduces cognitive load.
