# Example 01 - Dependent State With `useReducer`

## Problem

Separate state setters can drift apart when the values represent one lifecycle.

```tsx
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);
const [user, setUser] = useState<User | null>(null);

async function loadUser() {
  setLoading(true);

  try {
    const data = await fetchUser();
    setUser(data);
    setLoading(false);
  } catch {
    setError('Failed to load user');
    setLoading(false);
  }
}
```

The success path forgets to clear `error`. The error path forgets to clear `user`.

## Refactor

```tsx
type UserState =
  | { status: 'idle'; user: null; error: null }
  | { status: 'loading'; user: null; error: null }
  | { status: 'success'; user: User; error: null }
  | { status: 'error'; user: null; error: string };

type UserAction =
  | { type: 'load' }
  | { type: 'success'; payload: User }
  | { type: 'error'; payload: string };

function userReducer(state: UserState, action: UserAction): UserState {
  switch (action.type) {
    case 'load':
      return { status: 'loading', user: null, error: null };
    case 'success':
      return { status: 'success', user: action.payload, error: null };
    case 'error':
      return { status: 'error', user: null, error: action.payload };
    default:
      return state;
  }
}

const [state, dispatch] = useReducer(userReducer, {
  status: 'idle',
  user: null,
  error: null,
});

async function loadUser() {
  dispatch({ type: 'load' });

  try {
    const data = await fetchUser();
    dispatch({ type: 'success', payload: data });
  } catch {
    dispatch({ type: 'error', payload: 'Failed to load user' });
  }
}
```

## Rule of thumb

When state values must stay in sync, make invalid combinations impossible.
