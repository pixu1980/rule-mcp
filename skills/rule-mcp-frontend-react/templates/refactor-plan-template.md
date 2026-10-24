# React Refactor Plan

## Goal

Describe what the refactor improves.

## Current risks

- Risk 1
- Risk 2
- Risk 3

## Refactor steps

1. Add characterization tests or manual test notes for current behavior
2. Identify state that is derived, dependent, or too high in the tree
3. Move local state down where possible
4. Convert dependent state to reducer or state machine shape
5. Replace derived-state effects with render-time calculations
6. Fix keys and component identity
7. Remove unnecessary memoization
8. Extract hooks or view components by reason to change
9. Re-measure render behavior

## Acceptance criteria

- Behavior is preserved
- Invalid state combinations are removed
- Heavy components no longer re-render from unrelated local state
- Effects synchronize only with external systems
- List keys are stable
- Memoization is intentional and documented by context

## Rollback plan

Describe how to revert safely if the change introduces regressions.
