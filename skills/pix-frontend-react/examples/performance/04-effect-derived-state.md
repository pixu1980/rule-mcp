# Example 04 - Avoid Effects for Derived State

## Problem

```tsx
const [count, setCount] = useState(0);
const [double, setDouble] = useState(0);

useEffect(() => {
  setDouble(count * 2);
}, [count]);
```

This causes an extra render and makes the data flow harder to follow.

## Refactor

```tsx
const [count, setCount] = useState(0);
const double = count * 2;
```

## Good effect use

```tsx
useEffect(() => {
  localStorage.setItem("theme", theme);
}, [theme]);
```

The effect synchronizes React state with an external system.

## Rule of thumb

If the value can be calculated from current props or state, calculate it during render.
