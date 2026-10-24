# Tables Guide

> **Scope:** Data Grids & Tables | **WCAG:** 1.3.1, 1.4.1, 2.4.6, 4.1.2

## Core Rules

1. Use `<caption>` to describe the table.
2. Use `<th>` with `scope="col"` or `scope="row"`.
3. Avoid using `<div>` for tabular data unless using full ARIA table roles.
4. For sortable tables, indicate sort state via `aria-sort`.
5. Complex tables may use `<thead>`, `<tbody>`, `<tfoot>`.

## Example

```html
<table>
  <caption>
    Employee Data
  </caption>
  <thead>
    <tr>
      <th scope="col" aria-sort="ascending">Name <button aria-label="Sort by name">▲</button></th>
      <th scope="col">Role</th>
      <th scope="col">Department</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th scope="row">John Doe</th>
      <td>Engineer</td>
      <td>Engineering</td>
    </tr>
    <tr>
      <th scope="row">Jane Smith</th>
      <td>Designer</td>
      <td>Design</td>
    </tr>
  </tbody>
</table>
```

## Multi-level headers

For tables with rowspan/colspan, use multiple `<th>` elements with appropriate `scope` and `id`/`headers` associations.

## Keyboard interactions

| Key        | Action                                    |
| :--------- | :---------------------------------------- |
| Tab        | Navigate into/out of table                |
| Arrow keys | Navigate between cells (when interactive) |
