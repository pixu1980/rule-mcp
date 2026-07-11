# Example 07 - `useMemo` Discipline

## Problem

```tsx
const fullName = useMemo(() => {
  return `${user.firstName} ${user.lastName}`;
}, [user.firstName, user.lastName]);
```

This is unnecessary. The calculation is cheaper than the memoization machinery.

## Refactor

```tsx
const fullName = `${user.firstName} ${user.lastName}`;
```

## Good use

```tsx
const sortedItems = useMemo(() => {
  return [...items].sort((a, b) => a.price - b.price);
}, [items]);
```

The copy is important because `sort` mutates the array.

## Rule of thumb

Memoize expensive work, not simple values.
