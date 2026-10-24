/** @module core/review/persona-file/quote */

/** Strip one layer of matching quotes and unescape what the writer escaped. */
export function unquote(raw) {
  const value = raw.trim();

  if (value.length > 1 && value.startsWith('"') && value.endsWith('"')) {
    return value
      .slice(1, -1)
      .replaceAll(String.raw`\"`, '"')
      .replaceAll("\\\\", "\\");
  }

  return value;
}

/** Quote a scalar so a colon, a comma or a hash in it cannot change the parse. */
export function quote(value) {
  return `"${String(value)
    .replaceAll("\\", "\\\\")
    .replaceAll('"', String.raw`\"`)}"`;
}
