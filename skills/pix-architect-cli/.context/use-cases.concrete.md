# Use Cases

> **TL;DR**: User scenarios and interaction flows.

## How to use this doc

- Review use cases before implementing features
- Each use case has actors, preconditions, steps, and outcomes

---

## Template

```markdown
### UC-XX: <Use Case Name>

**Actor**: <Actor>

**Preconditions**:

- <What must be true before>

**Steps**:

1. <Action 1>
2. <Action 2>
3. <Action 3>

**Outcome**:

- <What happens on success>

**Alternatives**:

- <What happens if something goes wrong>
```

---

## Use Cases

### UC-01: Load Application

**Actor**: User

**Preconditions**:

- Browser supports Custom Elements v1
- JavaScript is enabled

**Steps**:

1. User navigates to the app URL
2. Browser loads `index.html`
3. JavaScript initializes the app shell component
4. Router renders the default route

**Outcome**:

- App is displayed and interactive

**Alternatives**:

- If JS fails: User sees empty page (TODO: add fallback content)

---

## TODO

- [ ] Add project-specific use cases when requirements are defined
