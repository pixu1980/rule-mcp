/** Accessible fallback route for unknown locations. */
export function NotFound() {
  return (
    <main data-part="not-found">
      <p data-part="eyebrow">404</p>
      <h1>That page wandered off.</h1>
      <a href="/">Back to Luma</a>
    </main>
  );
}
