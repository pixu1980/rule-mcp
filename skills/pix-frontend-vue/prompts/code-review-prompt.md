Review the following Vue 3 code for performance and maintainability issues.

Focus on:

- Wrong reactive container (`ref` vs `reactive` vs `shallowRef`)
- Destructuring or spreading reactive objects
- Watcher loops or unnecessary watchers
- Derived state computed in `watch` instead of `computed`
- State owned too high in the component tree
- Missing `:key` or index keys in `v-for`
- Missing intentional `:key` reset for entity-specific components
- Deep prop drilling better suited for `provide/inject`
- Components with too many reasons to change
- Missing `<Teleport>` for modals and tooltips
- Template refs accessed before mount

For each issue, return:

````md
### Issue title

- Pattern: [one of the 10 patterns]
- Severity: correctness | performance | maintainability | API design | visual glitch | premature optimization
- Why it matters:
- Suggested fix:

```vue
<!-- improved snippet -->
```
````

Rule of thumb:

````

Review this code:

```vue
PASTE_CODE_HERE
````
