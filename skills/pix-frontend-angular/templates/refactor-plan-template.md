# Angular Refactor Plan

## Goal

Describe what the refactor improves.

## Current risks

- Risk 1
- Risk 2
- Risk 3

## Refactor steps

1. Add test coverage for current behavior
2. Set `ChangeDetectionStrategy.OnPush` on all components
3. Replace local-state Subjects with signals
4. Replace derived-state effects with computed()
5. Add proper track in @for blocks
6. Fix subscription cleanup with takeUntilDestroyed
7. Lazy-load routes
8. Add @defer for heavy components
9. Extract services and split components

## Acceptance criteria

- Behavior is preserved
- Change detection runs only when necessary
- No memory leaks
- All routes are lazy-loaded
- Heavy content uses @defer

## Rollback plan

Describe how to revert safely if the change introduces regressions.
