# Web Components Guide

> **Scope:** Custom elements, Shadow DOM, ElementInternals, form controls, user preferences.
> **WCAG:** 1.3.1, 1.4.11, 2.1.1, 2.3.3, 2.4.7, 3.3.1, 4.1.2.

Testing custom elements with axe through the shadow root is covered in `rule-styleguide-javascript` (Required a11y Tests). This guide covers authoring.

## Core Rules

1. **Native inside the shadow root first.** A custom element that wraps a `<button>`, `<input>`, `<dialog>` or `popover` inherits its keyboard behavior, focus and role. Rebuild them with `role` and `tabindex` only when the host itself must be the control.
2. **Host semantics through `ElementInternals`.** When the host is the control, set `internals.role` and `internals.aria*`. Do not sprinkle `role` / `aria-*` attributes on the host: they are author-overridable and leak into the light DOM API.
3. **IDs do not cross the shadow boundary.** `aria-labelledby`, `aria-describedby`, `aria-controls` and `<label for>` only resolve inside one tree. Name the host with `internals.ariaLabel`, or keep the label and the control in the same root.
4. **Focus goes where the control is.** Use `attachShadow({ mode: "open", delegatesFocus: true })`. Focus on the host (click, `.focus()`, `<label>`) then moves to the first focusable element inside. Put the real control first in the shadow DOM.
5. **Form controls are form-associated.** Declare `static formAssociated = true`. Call `setFormValue()` for the value and `setValidity()` for errors. Native validation, `<label>`, `<form>` reset and `:invalid` then work.
6. **State is exposed, not only painted.** Every visual state (expanded, selected, checked, disabled) has its ARIA counterpart. Style from that state (`:host([aria-selected="true"])`, `:state()`) instead of a parallel class, so the paint cannot drift from what assistive technology hears.

## ElementInternals

```js
/** A toggle whose host is the control. */
class ToggleChip extends HTMLElement {
  #internals = this.attachInternals();

  connectedCallback() {
    this.#internals.role = "button";
    this.#internals.ariaPressed = "false";
    this.tabIndex = 0;
    this.addEventListener("click", () => this.#toggle());
    this.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        this.#toggle();
      }
    });
  }

  #toggle() {
    const pressed = this.#internals.ariaPressed !== "true";

    this.#internals.ariaPressed = String(pressed);
    if (pressed) {
      this.#internals.states.add("pressed");
    } else {
      this.#internals.states.delete("pressed");
    }
  }
}
```

A decorative icon element sets `internals.role = "none"`; a meaningful one sets `role = "img"` plus `ariaLabel`.

## Form-associated control

```js
class RatingInput extends HTMLElement {
  static formAssociated = true;
  #internals = this.attachInternals();

  constructor() {
    super();
    this.attachShadow({ mode: "open", delegatesFocus: true });
  }

  set value(rating) {
    this.#internals.setFormValue(String(rating));
    this.#internals.setValidity(rating ? {} : { valueMissing: true }, "Choose a rating", this.shadowRoot.querySelector("input"));
  }
}
```

The third `setValidity` argument anchors the native error bubble to the inner control.

## User preferences

| Preference               | Rule                                                                                                             |
| :----------------------- | :--------------------------------------------------------------------------------------------------------------- |
| `forced-colors: active`  | Borders and focus rings use system colors (`CanvasText`, `Highlight`). Never convey state with background alone. |
| `prefers-reduced-motion` | Motion lives under `@media (prefers-reduced-motion: no-preference)`. See `rule-ui-design-system`.                |
| `:focus-visible`         | Draw the ring on the inner control. Use `:host(:focus-visible)` when the host itself is focusable.               |

## Anti-patterns

- `role="button"` on the host with no `tabindex` and no Enter/Space handling.
- `aria-labelledby="label-id"` pointing from the shadow root to an element in the light DOM.
- A form-associated element that never calls `setValidity`, so an empty required field submits.
- A selected state painted by a class while `aria-selected` stays unset.
