/** A short, human date: "today", "yesterday", or "12 Mar". Avoids a relative
 *  "3 days ago" that goes stale while the tab sits open. */
export function shortDate(iso: string) {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return "";
  const days = Math.floor((Date.now() - then.getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  return then.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}
