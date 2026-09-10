

/** Age of a handoff in days, and its human label. */

/** Days between a `YYYY-MM-DD` string and today, or undefined. */
export function ageInDays(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return;
  }

  const then = Date.parse(`${date}T00:00:00Z`);

  if (Number.isNaN(then)) {
    return;
  }

  return Math.max(0, Math.round((Date.now() - then) / 86_400_000));
}

/** "3 days ago", "today", or "" when the handoff carried no date. */
export function ageLabel(date) {
  const days = ageInDays(date);

  if (days === undefined) {
    return "";
  }

  if (days === 0) {
    return "today";
  }

  return days === 1 ? "1 day ago" : `${days} days ago`;
}
