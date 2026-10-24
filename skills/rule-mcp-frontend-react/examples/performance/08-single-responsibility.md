# Example 08 - One Responsibility Means One Reason to Change

## Problem

```tsx
function UserProfile({ userId }: { userId: string }) {
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/users/${userId}`)
      .then((response) => response.json())
      .then(setUser)
      .catch(() => setError("Error loading user"));
  }, [userId]);

  if (error) return <p>{error}</p>;
  if (!user) return <p>Loading...</p>;

  return <h1>{user.name}</h1>;
}
```

This component changes when API behavior changes and when UI design changes.

## Refactor

```tsx
function useUser(userId: string) {
  const [state, setState] = useState<{
    user: User | null;
    error: string | null;
    loading: boolean;
  }>({ user: null, error: null, loading: true });

  useEffect(() => {
    let active = true;

    setState({ user: null, error: null, loading: true });

    fetch(`/api/users/${userId}`)
      .then((response) => response.json())
      .then((user) => {
        if (active) setState({ user, error: null, loading: false });
      })
      .catch(() => {
        if (active) setState({ user: null, error: "Error loading user", loading: false });
      });

    return () => {
      active = false;
    };
  }, [userId]);

  return state;
}

function UserProfile({ userId }: { userId: string }) {
  const { user, error, loading } = useUser(userId);

  if (error) return <p>{error}</p>;
  if (loading) return <p>Loading...</p>;

  return <h1>{user?.name}</h1>;
}
```

## Rule of thumb

Split when different changes affect different parts.
