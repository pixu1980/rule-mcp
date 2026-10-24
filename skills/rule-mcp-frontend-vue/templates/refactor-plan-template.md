# Vue 3 Refactor Plan

## Goal

Describe what the refactor improves.

## Current risks

- Risk 1
- Risk 2
- Risk 3

## Refactor steps

1. Add test coverage or manual test notes for current behavior
2. Identify reactive container issues (ref vs reactive vs shallowRef)
3. Replace derived-state watchers with computed
4. Move state down to the smallest responsible component
5. Fix list keys and component identity
6. Replace deep prop drilling with provide/inject
7. Extract composables by responsibility
8. Add Teleport for modals and overlays
9. Re-measure render behavior

## Acceptance criteria

- Behavior is preserved
- Reactive tracking is correct (no missing deps)
- Computed values replace derived-state watchers
- Components re-render only when their own state changes
- List keys are stable
- Modals and tooltips use Teleport

## Rollback plan

Describe how to revert safely if the change introduces regressions.
