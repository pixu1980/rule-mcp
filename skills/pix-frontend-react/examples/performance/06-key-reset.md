# Example 06 - Reset With `key`

## Problem

The form keeps local state from the previous user.

```tsx
function App() {
  const [userId, setUserId] = useState('1');

  return (
    <>
      <UserSelector value={userId} onChange={setUserId} />
      <UserForm userId={userId} />
    </>
  );
}
```

## Refactor

```tsx
function App() {
  const [userId, setUserId] = useState('1');

  return (
    <>
      <UserSelector value={userId} onChange={setUserId} />
      <UserForm key={userId} userId={userId} />
    </>
  );
}
```

When `userId` changes, React discards the old `UserForm` instance and creates a new one.

## Rule of thumb

If the correct behavior is a full fresh start, change the key.
