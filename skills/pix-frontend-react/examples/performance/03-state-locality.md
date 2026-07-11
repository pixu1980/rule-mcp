# Example 03 - State Locality

## Problem

`App` owns search state, so a heavy sibling re-renders while typing.

```tsx
function App() {
  const [search, setSearch] = useState('');

  return (
    <main>
      <SearchBox value={search} onChange={setSearch} />
      <Results query={search} />
      <HeavyChart />
    </main>
  );
}
```

## Refactor

```tsx
function App() {
  return (
    <main>
      <SearchSection />
      <HeavyChart />
    </main>
  );
}

function SearchSection() {
  const [search, setSearch] = useState('');

  return (
    <section aria-label="Search products">
      <SearchBox value={search} onChange={setSearch} />
      <Results query={search} />
    </section>
  );
}
```

## Rule of thumb

Do not light the whole house when one room needs a lamp. Keep state near the UI that uses it.
