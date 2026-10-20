import {
  BEHAVIORS,
  CalendarEntry,
  CategoryId,
  EMOTIONS,
  category,
  entryTitle,
  fromDateKey,
  todayKey,
} from "./calendar";
import { addDays, completeCycles, cycles } from "./cycles";
import { painArea, type PainAreaId } from "./myVoice";

// "My patterns": plain counts a family can point to. These words are checked
// by a test (patterns.test.tsx) for words this view must never use: it counts,
// and leaves the meaning to the doctor.

export const PATTERN_RANGES = [
  { id: 30, label: "Last 30 days" },
  { id: 90, label: "Last 3 months" },
  { id: 180, label: "Last 6 months" },
] as const;
export type PatternRange = (typeof PATTERN_RANGES)[number]["id"];

export const PATTERNS_FOOTER = "These are just counts. Bring them to your doctor to talk about.";

const shortDay = (key: string) => fromDateKey(key).toLocaleDateString(undefined, { month: "short", day: "numeric" });

export type Patterns = {
  /** "Something hurts: 9 days", most days first. */
  daysByKind: { key: string; category: CategoryId; label: string; days: number }[];
  /** Past periods, newest first; null until 2 complete cycles exist. */
  periods: { start: string; periodDays: number; length: number | null }[] | null;
  /** "In the week before a period: …"; null until 2 complete cycles exist. */
  beforePeriod: { label: string; times: number }[] | null;
  /** Entries marked "This is new or different". */
  newOrDifferent: { date: string; label: string }[];
};

/** The things inside an entry worth counting before a period: each behavior
 *  ticked, each feeling, each place that hurt, or else the entry itself. */
function countables(e: CalendarEntry): string[] {
  const d = e.details;
  if (e.category === "behavior" && d.changes?.length) {
    return d.changes.map((c) => BEHAVIORS.find((b) => b.id === c)!.label.toLowerCase());
  }
  if (e.category === "mood" && d.feelings?.length) {
    return d.feelings.filter((f) => f !== "dont-know").map((f) => `feeling ${EMOTIONS.find((x) => x.id === f)!.label.toLowerCase()}`);
  }
  if (e.category === "pain" && d.spots?.length) {
    return d.spots.map((s) => `${painArea(s.area as PainAreaId).short.toLowerCase()} pain`);
  }
  return [entryTitle(e).toLowerCase()];
}

export function patterns(all: CalendarEntry[], range: PatternRange): Patterns {
  const today = todayKey();
  const from = addDays(today, -(range - 1));
  const inRange = all.filter((e) => e.entryDate >= from && e.entryDate <= today);

  const days = new Map<string, { category: CategoryId; label: string; days: Set<string> }>();
  for (const e of inRange) {
    if (e.category === "period" && e.details.spotting) continue;
    const key = `${e.category}:${e.customLabel ?? ""}`;
    const row = days.get(key) ?? { category: e.category, label: entryTitle(e), days: new Set<string>() };
    row.days.add(e.entryDate);
    days.set(key, row);
  }
  const daysByKind = [...days.entries()]
    .map(([key, r]) => ({ key, category: r.category, label: r.label, days: r.days.size }))
    .sort((a, b) => b.days - a.days || a.label.localeCompare(b.label));

  const enough = completeCycles(all).length >= 2;
  const allCycles = cycles(all);
  const periods = enough ? allCycles.filter((c) => c.start >= from).reverse() : null;

  let beforePeriod: Patterns["beforePeriod"] = null;
  if (enough) {
    const counts = new Map<string, number>();
    for (const c of allCycles.filter((c) => c.start >= from)) {
      const weekBefore = all.filter(
        (e) => e.category !== "period" && e.entryDate >= addDays(c.start, -7) && e.entryDate < c.start
      );
      for (const e of weekBefore) for (const thing of countables(e)) counts.set(thing, (counts.get(thing) ?? 0) + 1);
    }
    beforePeriod = [...counts.entries()]
      .map(([label, times]) => ({ label, times }))
      .sort((a, b) => b.times - a.times || a.label.localeCompare(b.label));
  }

  const newOrDifferent = inRange
    .filter((e) => e.typical === "new")
    .sort((a, b) => b.entryDate.localeCompare(a.entryDate))
    .map((e) => ({ date: shortDay(e.entryDate), label: entryTitle(e) }));

  return { daysByKind, periods, beforePeriod, newOrDifferent };
}

/** "irritable 4 times, lower belly pain 3 times". */
export function beforePeriodSentence(list: { label: string; times: number }[]): string {
  return list
    .slice(0, 6)
    .map((x) => `${x.label} ${x.times} ${x.times === 1 ? "time" : "times"}`)
    .join(", ");
}

export { category, shortDay };
