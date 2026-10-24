# Angular Performance Playbook

This playbook supports the rule-mcp-frontend-angular performance review skill. It covers change detection, signals, lazy loading, and component architecture.

## Mental model

Angular performance is about controlling **when change detection runs** and **how much work** each cycle does.

Key levers:

1. **ChangeDetectionStrategy.OnPush** - limits checks to input changes, events, and async pipes
2. **Signals** - provide fine-grained reactivity without zone.js
3. **Lazy loading** - defers code download until needed
4. **`@defer`** - defers component rendering until conditions are met

## Pattern 1 - OnPush by default

`ChangeDetectionStrategy.Default` checks every component in the tree on any async activity (timer, HTTP response, click, etc.). `OnPush` checks only when:

- Component inputs change (new reference)
- An event fires inside the component
- An async pipe emits
- A signal used in the template changes

### Migration

```typescript
@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  // ...
})
```

### Common OnPush pitfalls

- Mutating an input object instead of replacing it -> component doesn't update
- Using `async` pipe correctly (it marks for check on emission)
- Using `signal()` correctly (tracks automatically in templates)

## Pattern 2 - Signals over RxJS for state

### When to use

| Use case              | Tool                                  |
| --------------------- | ------------------------------------- |
| Local component state | `signal()`                            |
| Derived values        | `computed()`                          |
| Side effects          | `effect()`                            |
| Complex async streams | RxJS (`Subject`, `mergeMap`, etc.)    |
| HTTP requests         | RxJS (`HttpClient`)                   |
| Forms                 | `FormsModule` / `ReactiveFormsModule` |

### Signal service pattern

```typescript
@Injectable({ providedIn: "root" })
export class CartService {
  private items = signal<CartItem[]>([]);
  readonly total = computed(() => this.items().reduce((sum, i) => sum + i.price, 0));

  addItem(item: CartItem) {
    this.items.update((current) => [...current, item]);
  }
}
```

## Pattern 3 - Track in @for

Angular 17+ `@for` with `track`:

```html
@for (item of items; track item.id) {
<li>{{ item.title }}</li>
} @empty {
<li>No items</li>
}
```

Without `track`, Angular identity-matches by index - same as React's key={index} bug.

## Pattern 4 - computed() over effect() for derivation

`effect()` runs as a side effect. Use it for logging, localStorage, imperative API calls. Do not use it to derive state.

```typescript
// ❌ Effect used for derivation
private items = signal<Item[]>([]);
private sortedItems = signal<Item[]>([]);

constructor() {
  effect(() => {
    this.sortedItems.set([...this.items()].sort(compareItems));
  });
}

// ✅ computed for derivation
readonly sortedItems = computed(() =>
  [...this.items()].sort(compareItems)
);
```

## Pattern 5 - Subscription cleanup

Every subscription, interval, and event listener MUST be cleaned up.

### takeUntilDestroyed (Angular 16+)

```typescript
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";

export class MyComponent {
  private destroyRef = inject(DestroyRef);

  constructor() {
    interval(1000)
      .pipe(takeUntilDestroyed())
      .subscribe((v) => console.log(v));
  }
}
```

### Manual cleanup (legacy)

```typescript
private destroy$ = new Subject<void>();

ngOnInit() {
  this.route.params
    .pipe(takeUntil(this.destroy$))
    .subscribe(params => this.load(params.id));
}

ngOnDestroy() {
  this.destroy$.next();
  this.destroy$.complete();
}
```

## Pattern 6 - State locality

Global service state persists across routes and can cause stale data. Component-scoped `signal()` resets when the component is destroyed.

```typescript
// ✅ Local search state - resets with component
@Component({...})
export class SearchComponent {
  private searchTerm = signal('');
  readonly results = computed(() =>
    this.filter(this.allItems(), this.searchTerm())
  );
}
```

## Pattern 7 - Lazy loading

All routes should be lazy unless the component is needed on every page.

```typescript
export const routes: Routes = [
  { path: "", loadComponent: () => import("./home/_Home.component") },
  { path: "settings", loadChildren: () => import("./settings/settings.routes") },
];
```

## Pattern 8 - Component responsibility

### Signs of mixed responsibility

- Component changes when API contract changes
- Same component changes when UI design changes
- Data fetching, formatting, error states, and handlers in one file

### Split pattern

```typescript
// Service: data + state
@Injectable()
export class UserDataService {
  private user = signal<User | null>(null);
  private loading = signal(false);
  private error = signal<string | null>(null);

  loadUser(id: string) { /* fetch + update signals */ }
}

// Component: view only
@Component({...})
export class UserProfile {
  private userService = inject(UserDataService);
  readonly user = this.userService.user.asReadonly();
}
```

## Pattern 9 - @defer

`@defer` renders content lazily when a trigger condition is met. Available in Angular 17+.

```html
@defer (on viewport; prefetch on idle) {
<expensive-chart />
} @placeholder {
<div data-part="placeholder">Loading...</div>
} @loading (after 100ms; minimum 500ms) {
<div data-part="loading">Loading chart...</div>
} @error {
<div data-part="error">Failed to load chart</div>
}
```

### Triggers

| Trigger           | When                                   |
| ----------------- | -------------------------------------- |
| `on viewport`     | When element enters viewport           |
| `on idle`         | When browser is idle                   |
| `on immediate`    | Immediately after rendering            |
| `on timer(500ms)` | After a delay                          |
| `when condition`  | When a boolean expression becomes true |

## Pattern 10 - Avoid ngDoCheck

`ngDoCheck` runs on every change detection cycle. It is almost always a sign that you are working against the framework.

```typescript
// ❌ ngDoCheck
ngDoCheck() {
  if (this.oldVal !== this.newVal) {
    this.update();
  }
}

// ✅ signal + computed
private val = signal(initial);
readonly derived = computed(() => process(this.val()));
```

## Measurement notes

Use Angular DevTools browser extension:

- **Profiler** tab: record change detection cycles, see component tree updates
- **Components** tab: inspect component state and change detection strategy

Browser Performance panel: identify long scripting tasks caused by change detection.

## Final principle

Angular performance is about reducing change detection work. `OnPush` + Signals + Lazy loading + `@defer` cover 90% of real-world performance issues.
