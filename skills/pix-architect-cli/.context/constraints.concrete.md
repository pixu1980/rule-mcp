# Domain Constraints

> **TL;DR**: Business rules and technical constraints that must always be respected.

## How to use this doc

- Check these constraints before implementing features
- Violations require explicit approval

---

## Technical Constraints

### TC-01: Zero Runtime Dependencies

- No external JavaScript libraries at runtime
- DevDependencies (build tools, test tools) are allowed
- Rationale: Performance, simplicity, no supply chain risk

### TC-02: Custom Elements v1 Only

- All UI components use `HTMLElement` extension
- No Shadow DOM (light DOM only)
- No `<template>` or `<slot>` elements
- Rationale: Simpler debugging, easier styling

### TC-03: ES Modules

- All JavaScript uses ES module syntax (`import`/`export`)
- No CommonJS (`require`)
- Rationale: Modern standard, tree-shaking support

### TC-04: CSS Cascade Layers

- Use `@layer` for cascade management
- Define tokens as CSS custom properties
- Rationale: Predictable specificity

---

## Browser Support

### BC-01: Modern Browsers

- Support latest 2 versions of Chrome, Firefox, Safari, Edge
- No IE11 support
- Rationale: Modern APIs, smaller bundle

---

## TODO

- [ ] Add business/domain constraints when requirements are defined
