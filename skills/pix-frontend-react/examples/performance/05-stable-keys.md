# Example 05 - Stable Keys

## Problem

```tsx
{
  tasks.map((task, index) => <TaskItem key={index} task={task} />);
}
```

If tasks can be deleted or reordered, React may reuse the wrong component instance. Local input state can appear to move to another task.

## Refactor

```tsx
{
  tasks.map((task) => <TaskItem key={task.id} task={task} />);
}
```

## Acceptable exception

```tsx
{
  ["Small", "Medium", "Large"].map((size, index) => <li key={index}>{size}</li>);
}
```

This is acceptable only because the list is static and has no stateful children.

## Rule of thumb

Changing lists need stable IDs.
