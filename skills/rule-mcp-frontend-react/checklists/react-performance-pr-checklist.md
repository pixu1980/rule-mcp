# React Performance PR Checklist

Use this checklist before approving a React pull request.

## 1. State consistency

- Are multiple `useState` values updated together?
- Can the UI show impossible combinations, such as data and error at the same time?
- Would a reducer or discriminated union state shape make transitions safer?
- Are reset paths complete and easy to verify?

## 2. State ownership

- Is state owned by the smallest component that needs it?
- Does a parent re-render heavy children because state is too high?
- Is state lifted only because it is actually shared?
- Was `React.memo` added to compensate for poor state placement?

## 3. Rendering vs frequency

- Is the slowdown caused by expensive rendering?
- Is the slowdown caused by repeated network calls?
- Is `useTransition` used for local UI rendering work rather than network delay?
- Is debounce used when the goal is to reduce repeated calls or repeated expensive work?

## 4. Effects

- Is `useEffect` syncing with something outside React?
- Is an effect only calculating state from other state?
- Are dependencies correct and intentional?
- Is cleanup provided for subscriptions, timers, and browser events?
- Would a data-fetching library be more appropriate for request caching, loading states, and errors?

## 5. Keys and identity

- Does every changing list use stable unique keys?
- Is `key={index}` avoided for lists that can reorder, filter, insert, or delete?
- Are stateful children inside lists protected from identity bugs?
- Is `key` used intentionally when a component should reset completely?

## 6. Memoization

- Is `useMemo` reserved for expensive calculations or meaningful referential stability?
- Are simple strings, numbers, and tiny calculations left un-memoized?
- Are arrays copied before sorting, reversing, or mutating inside memoized logic?
- Is the dependency list correct?

## 7. Responsibility boundaries

- Does the component have one reason to change?
- Are data fetching, data transformation, loading states, error states, and rendering mixed together?
- Would a custom hook isolate data logic?
- Would smaller presentational components make the file easier to maintain?

## 8. Layout timing

- Is there visible flicker, jump, or one-frame wrong positioning?
- Does the code measure DOM layout and immediately update style or layout?
- Should this specific effect use `useLayoutEffect`?
- Is `useLayoutEffect` limited to cases where pre-paint work is required?

## 9. Component API design

- Does the component expose too many props?
- Are many boolean flags used for small variations?
- Are render props multiplying without a clear boundary?
- Would compound components or composition make customization cleaner?

## 10. Final review questions

- Is the suggested optimization solving the real bottleneck?
- Is the fix simpler than the problem?
- Can the behavior be explained with a clear rule of thumb?
- Should the team measure with React DevTools Profiler before deeper refactoring?
