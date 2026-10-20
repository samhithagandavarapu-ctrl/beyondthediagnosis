import { CalendarEntry, dateKey, fromDateKey, isPeriodDay, todayKey } from "./calendar";

// Period cycles, worked out in the browser from calendar entries and never
// stored. A cycle starts on a day marked "first day of my period"; a run of
// period days nobody marked still starts one, so a forgotten tap doesn't
// merge two periods. Spotting is never a period day. Nothing here predicts
// fertility or ovulation, and nothing names a condition.

export type Cycle = {
  /** First day of the period, "2026-10-04". */
  start: string;
  /** How many days the period lasted. */
  periodDays: number;
  /** Days from this start to the next one; null for the cycle still going. */
  length: number | null;
};

const DAY = 86_400_000;

export function daysBetween(a: string, b: string): number {
  return Math.round((fromDateKey(b).getTime() - fromDateKey(a).getTime()) / DAY);
}

export function addDays(key: string, n: number): string {
  const d = fromDateKey(key);
  d.setDate(d.getDate() + n);
  return dateKey(d);
}

/** Every day with a period logged (not spotting), oldest first. */
export function periodDays(entries: CalendarEntry[]): string[] {
  return [...new Set(entries.filter(isPeriodDay).map((e) => e.entryDate))].sort();
}

/** First days of each period, oldest first. */
export function cycleStarts(entries: CalendarEntry[]): string[] {
  const days = periodDays(entries);
  const daySet = new Set(days);
  const marked = new Set(
    entries.filter((e) => isPeriodDay(e) && e.details.firstDay).map((e) => e.entryDate)
  );
  const starts: string[] = [];
  for (const d of days) {
    const runStart = !daySet.has(addDays(d, -1));
    const recent = starts.length > 0 && daysBetween(starts[starts.length - 1], d) < 10;
    if (marked.has(d) && !(recent && !runStart)) starts.push(d);
    else if (runStart && !recent) starts.push(d);
  }
  return starts;
}

/** Each period: when it started, how long it lasted, and the cycle length. */
export function cycles(entries: CalendarEntry[]): Cycle[] {
  const daySet = new Set(periodDays(entries));
  const starts = cycleStarts(entries);
  return starts.map((start, i) => {
    const next = starts[i + 1];
    // Count the period's days, allowing one missed day in the middle.
    let last = start;
    for (let d = addDays(start, 1); !next || d < next; d = addDays(d, 1)) {
      if (daySet.has(d)) last = d;
      else if (!daySet.has(addDays(d, 1))) break;
    }
    return {
      start,
      periodDays: daysBetween(start, last) + 1,
      length: next ? daysBetween(start, next) : null,
    };
  });
}

/** Cycles with a known length: the ones a next period has closed. */
export function completeCycles(entries: CalendarEntry[]): Cycle[] {
  return cycles(entries).filter((c) => c.length !== null);
}

const average = (ns: number[]) => Math.round(ns.reduce((a, b) => a + b, 0) / ns.length);

export type Prediction = {
  /** When the next period might start. */
  start: string;
  /** The days it might cover, for the dashed "Maybe" outline. */
  days: string[];
};

/** The next period, from the average of the last 3 cycle lengths. Only once
 *  there are 2 complete cycles, and only while that day is still ahead. */
export function predictNext(entries: CalendarEntry[]): Prediction | null {
  const all = cycles(entries);
  const done = all.filter((c) => c.length !== null);
  if (done.length < 2) return null;
  const recent = done.slice(-3);
  const cycleLength = average(recent.map((c) => c.length as number));
  const periodLength = Math.max(1, average(all.slice(-3).map((c) => c.periodDays)));
  const start = addDays(all[all.length - 1].start, cycleLength);
  if (start < todayKey()) return null;
  return { start, days: Array.from({ length: periodLength }, (_, i) => addDays(start, i)) };
}

/** Days since the last period started, or null if none is logged. */
export function daysSinceLastPeriod(entries: CalendarEntry[]): number | null {
  const starts = cycleStarts(entries);
  return starts.length ? daysBetween(starts[starts.length - 1], todayKey()) : null;
}
