# Forms Guide

> **Scope:** Label binding, error messaging, field grouping | **WCAG:** 1.1.1, 1.3.1, 1.3.5, 3.3.1, 3.3.2, 4.1.2, 4.1.3

## Core Rules

1. **Every input MUST have a label** — associated via `for` + `id` or wrapping.
2. **Required fields** MUST have `required` attribute and/or `aria-required="true"`.
3. **Error messages** MUST be programmatically associated using `aria-describedby` or `aria-errormessage`.
4. **Error state** MUST use `aria-invalid="true"`.
5. **Placeholder is NOT a label** — it disappears when typing and often fails contrast.
6. **Do not convey information via color alone** — add icons or text.

## Good Examples

### Explicit Labels and Helper Text

```html
<div class="form-group">
  <label for="email-field">Email Address</label>
  <input type="email" id="email-field" aria-describedby="email-help" required />
  <p id="email-help">We'll never share your email.</p>
</div>
```

### Error Handling

```html
<div class="form-group error">
  <label for="password-field">Password</label>
  <input type="password" id="password-field" aria-invalid="true" aria-errormessage="pass-error" />
  <p id="pass-error" role="alert">Password must be at least 8 characters.</p>
</div>
```

### Fieldset Grouping

```html
<fieldset>
  <legend>Shipping address</legend>
  <label for="street">Street</label>
  <input id="street" type="text" />
  <label for="city">City</label>
  <input id="city" type="text" />
</fieldset>
```

## Bad Examples

```html
<!-- ❌ Placeholder as label — disappears when typing -->
<input type="text" placeholder="Enter your username" />

<!-- ❌ No label -->
<input type="email" />

<!-- ❌ Color-only error indication -->
<input type="text" style="border: 1px solid red;" />
```

## Accessibility Implications

- **Cognitive Load:** Explicit labels reduce effort to remember what a field is for.
- **Predictability:** Standard input types (email, tel, date) enable specialized keyboards and autofill.
