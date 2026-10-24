# Example 02 - `useTransition` vs Debounce

## Problem A - expensive local rendering

The products are already loaded, but filtering and rendering the result makes typing feel slow.

```tsx
const [search, setSearch] = useState("");
const [results, setResults] = useState(products);
const [isPending, startTransition] = useTransition();

function handleChange(event: ChangeEvent<HTMLInputElement>) {
  const value = event.target.value;
  setSearch(value);

  startTransition(() => {
    setResults(products.filter((product) => product.name.includes(value)));
  });
}
```

Use `useTransition` because the work is UI rendering work.

## Problem B - repeated network calls

```tsx
function handleChange(event: ChangeEvent<HTMLInputElement>) {
  fetch(`/api/search?q=${event.target.value}`)
    .then((response) => response.json())
    .then(setResults);
}
```

Use debounce because the problem is request frequency.

```tsx
function debounce<T extends (...args: never[]) => void>(callback: T, delay: number) {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  return (...args: Parameters<T>) => {
    if (timeoutId) window.clearTimeout(timeoutId);

    timeoutId = window.setTimeout(() => {
      callback(...args);
    }, delay);
  };
}
```

## Rule of thumb

`useTransition` improves render responsiveness. Debounce reduces frequency.
