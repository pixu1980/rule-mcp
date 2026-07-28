# Toasts & Notifications Guide

> **Scope:** Dynamic Feedback | **WCAG:** 1.1.1, 1.3.1, 2.2.1, 4.1.3

## Core Rules

1. **Alerts:** Critical errors MUST use `role="alert"` (equivalent to `aria-live="assertive"`).
2. **Status:** Non-critical messages MUST use `role="status"` (equivalent to `aria-live="polite"`).
3. **Auto-dismissal:** Avoid auto-closing toasts that contain actionable links or long text. Give users control to close them.
4. **Focus:** If a toast contains an action button, ensure it is focusable and keyboard operable.
5. **Announcement:** Dynamic toasts injected into the DOM are automatically announced by screen readers when using the correct role.

## Examples

```html
<!-- Critical error (interrupts) -->
<div role="alert" class="toast toast-error">
  <span aria-hidden="true">✕</span>
  <p>Payment failed. Please try again.</p>
  <button type="button">Retry</button>
  <button type="button" aria-label="Dismiss">✕</button>
</div>

<!-- Status update (non-interrupting) -->
<div role="status" class="toast toast-success">
  <span aria-hidden="true">✓</span>
  <p>Item added to cart</p>
</div>
```

## Implementation

```javascript
function showToast(message, type) {
  const toast = document.createElement('div');
  toast.textContent = message;
  toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
  document.getElementById('toast-container').appendChild(toast);

  // Auto-dismiss (only for non-actionable toasts)
  if (!toast.querySelector('button')) {
    setTimeout(() => toast.remove(), 5000);
  }
}
```
