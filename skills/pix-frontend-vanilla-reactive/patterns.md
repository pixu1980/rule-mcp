# pix-vanilla-reactive Pattern Index

> Quick reference for file structure and exports.

## Core exports (`core/index.js`)

```
html              TemplateResult from tagged template or string
render            Mount TemplateResult into DOM container
registerFilter    Add a custom filter for {{ expr | filter }}
vrComponent       Decorator: define CE + CSS + reactive lifecycle
Signal, effect    Signal primitives (State, Computed, effect)
Store             Proxy-based state container
ClickHandlerPart  @event="handler(args)" binding
ExprPart          {{ }} interpolation
ForPart           <for> loop
IfPart, SwitchPart <if>/<elseif>/<else> and <switch>/<case>/<default>
AttributePart     attribute binding
PropertyPart      .prop binding
ChildNodePart     text / template / iterable rendering
TemplateInstance  Compiled template (one per unique html``)
```

## File structure

```
src/
  index.html                    ← <app-root></app-root> + <script module>
  index.js                     ← Store + tickState + effect + render
  core/
    index.js                   ← Unified re-exports
    signals/                   ← Signal.State, Computed, effect, scheduler
    store/                     ← Proxy Store (get, set, replace, snapshot)
    template-engine/           ← html, render, getTemplate, all parts
    decorator/
      _vr-component.js          ← vrComponent(this, { tag, css })
  components/                  ← One folder per component
    App/
      index.js                  ← Barrel
      _App.js                   ← CE + vrComponent
      _App.css                  ← Adopted stylesheet
  helpers/
    actions/                    ← Store mutation functions
    computed/                   ← ComputedSignal factories
    shared/                     ← Store + tickState singletons
    func/                       ← Pattern B functional components
      _todoList.js
      _contactCard.js
  styles/
    _base.css
    _variables.css
```

## 3 component patterns (see SKILL.md §5)

| Pattern | File | Lifecycle | CSS | Events |
|---------|------|-----------|-----|--------|
| A: CE + vrComponent | `_Comp.js` | auto (vrComponent) | auto (vrComponent) | methods on class |
| B: Functional fn | `_comp.js` | parent CE | by parent | `result._scope = { fn }` |
| C: CE + ext template | `_Comp.js` + `.template.html` | auto (vrComponent) | auto (vrComponent) | methods on class |

## Scope resolution (`_scope`)

```
result._scope[name]    → Pattern B explicit
result._context[name]  → fallback (Pattern C → B)
component instance     → auto by vrComponent (Pattern A/C)
```

## Template syntax

| Syntax | Purpose |
|--------|---------|
| `{{ expr }}` | Escaped data |
| `{{ expr \| raw }}` | Raw HTML |
| `{{ Fn(args) }}` | Component composition |
| `attr="{{ }}"` | Attribute binding |
| `.prop="{{ }}"` | Property binding |
| `@event="handler(args)"` | Event binding |
| `<for each="x in xs">` | Loop |
| `<if>/<elseif>/<else>` | Conditional |
| `<switch>/<case>/<default>` | Value match |
