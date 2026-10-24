# Example 09 - Fix Flicker With `useLayoutEffect`

## Problem

```tsx
useEffect(() => {
  const rect = buttonRef.current?.getBoundingClientRect();

  if (!rect || !tooltipRef.current) return;

  tooltipRef.current.style.top = `${rect.bottom + 10}px`;
}, []);
```

The tooltip can appear in the wrong place for one frame because `useEffect` runs after paint.

## Refactor

```tsx
useLayoutEffect(() => {
  const rect = buttonRef.current?.getBoundingClientRect();

  if (!rect || !tooltipRef.current) return;

  tooltipRef.current.style.top = `${rect.bottom + 10}px`;
}, []);
```

## Warning

`useLayoutEffect` blocks paint. Use it only when measurement and immediate layout updates must happen before the user sees the frame.

## Rule of thumb

If the user can see the glitch, fix it before paint.
