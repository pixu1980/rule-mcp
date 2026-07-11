# React Performance Decision Matrix

| Symptom | Check first | Likely cause | Recommended move |
|---|---|---|---|
| Typing feels slow | Which component owns the input state? | State is too high or heavy rendering happens on each keystroke | Move state down, then consider `useTransition` for heavy local rendering |
| Search sends a request per keypress | Request trigger | No debounce or cancellation | Debounce, cancel stale requests, or use a data-fetching library |
| Local filtering freezes the UI | Size of local data and render cost | Expensive non-urgent rendering | Use `useTransition` and consider virtualization for huge lists |
| Loading, data, and error conflict | State shape | Dependent state split across setters | Use `useReducer` or a discriminated union |
| Effect keeps re-running | Dependencies and setter calls | Derived state in effect or unstable dependencies | Calculate during render, stabilize inputs only when needed |
| Row input values jump after delete | List key | Index key identity bug | Use stable item IDs |
| Form shows previous entity data | Component identity | Local state preserved across entity change | Add `key={entityId}` to reset fully |
| Many simple values use `useMemo` | Calculation cost | Premature optimization | Remove unnecessary memoization |
| Tooltip jumps after appearing | Paint timing | Measuring in `useEffect` | Use `useLayoutEffect` only for measurement plus immediate layout update |
| Accordion API has too many props | Public API surface | Prop soup | Use composition or compound components |
| Large component is hard to review | Reasons to change | Mixed responsibilities | Extract data hook, view component, and smaller UI pieces |
| PR adds `React.memo` everywhere | Render ownership | Treating symptoms instead of cause | Inspect state placement and prop stability first |

## Fast diagnosis questions

1. Is this a render problem or a frequency problem?
2. Is the state located where the change actually happens?
3. Are we storing something that can be calculated?
4. Is component identity stable where it should be stable?
5. Is component identity reset where it should be reset?
6. Are we optimizing real work or making simple code more complex?
