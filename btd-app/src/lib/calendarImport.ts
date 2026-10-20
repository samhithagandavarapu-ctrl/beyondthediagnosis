import type { Symptom, SymptomReporter, SymptomTrajectory } from "./appointmentPdf";
import { CalendarEntry, CategoryId, dateKey, entryTitle, fromDateKey, todayKey } from "./calendar";
import { addDays, daysBetween } from "./cycles";
import { painArea, type PainAreaId } from "./myVoice";

// Bringing calendar entries into Appointment Prep. The person always picks
// which entries; nothing comes over on its own. Entries of the same kind
// become ONE symptom (which can be split back out), and nothing already
// typed is changed: symptoms are added after what's there.

export type RangePick = { id: string; label: string; from: string; to: string };

/** The quick picks for "Bring in from my calendar". "Since my last visit"
 *  is there only when a summary has been made before. */
export function rangePicks(lastVisit: string | null): RangePick[] {
  const today = todayKey();
  const picks: RangePick[] = [
    { id: "2w", label: "Last 2 weeks", from: addDays(today, -13), to: today },
    { id: "1m", label: "Last month", from: addDays(today, -29), to: today },
    { id: "3m", label: "Last 3 months", from: addDays(today, -89), to: today },
  ];
  if (lastVisit) {
    picks.push({ id: "last", label: "Since my last visit", from: dateKey(new Date(lastVisit)), to: today });
  }
  return picks;
}

/** Entries that can be brought in: in the range, of the chosen kind. My Voice
 *  check-ins aren't listed; they go on the summary through "In their own
 *  words". */
export function importable(
  entries: CalendarEntry[],
  from: string,
  to: string,
  only: CategoryId | "all" = "all"
): CalendarEntry[] {
  return entries
    .filter((e) => !e.checkInId && e.entryDate >= from && e.entryDate <= to)
    .filter((e) => only === "all" || e.category === only)
    .sort((a, b) => b.entryDate.localeCompare(a.entryDate) || b.loggedAt.localeCompare(a.loggedAt));
}

const shortDay = (key: string) =>
  fromDateKey(key).toLocaleDateString(undefined, { month: "short", day: "numeric" });

/** The same kind of thing: same category, and the same custom symptom. */
function groupKey(e: CalendarEntry): string {
  return `${e.category}:${e.details.customSymptomId ?? e.customLabel?.trim().toLowerCase() ?? ""}`;
}

/** 0 to 1, whatever scale the strength was given on. */
function strength01(e: CalendarEntry): number | null {
  if (e.severity === null || !e.severityScale) return null;
  if (e.severityScale === "faces") return (e.severity - 1) / 2;
  if (e.severityScale === "five") return (e.severity - 1) / 4;
  return e.severity / 10;
}

/** Getting stronger / about the same / getting better: the first third of the
 *  entries against the last third. Needs at least 3 with a strength. */
export function trajectory(entries: CalendarEntry[]): SymptomTrajectory | undefined {
  const scored = [...entries]
    .sort((a, b) => a.entryDate.localeCompare(b.entryDate) || a.loggedAt.localeCompare(b.loggedAt))
    .map(strength01)
    .filter((v): v is number => v !== null);
  if (scored.length < 3) return undefined;
  const third = Math.max(1, Math.floor(scored.length / 3));
  const avg = (ns: number[]) => ns.reduce((a, b) => a + b, 0) / ns.length;
  const change = avg(scored.slice(-third)) - avg(scored.slice(0, third));
  if (change > 0.15) return "stronger";
  if (change < -0.15) return "better";
  return "same";
}

function reporter(entries: CalendarEntry[]): SymptomReporter {
  const who = new Set(entries.map((e) => e.reportedBy));
  return who.size === 1 ? [...who][0] : "both";
}

/** "Something hurts: lower belly, head". */
function describe(entries: CalendarEntry[]): string {
  const title = entryTitle(entries[0]);
  if (entries[0].category === "pain") {
    const where = [...new Set(entries.flatMap((e) => (e.details.spots ?? []).map((s) => s.area)))];
    if (where.length) return `${title}: ${where.map((a) => painArea(a as PainAreaId).short.toLowerCase()).join(", ")}`;
  }
  return title;
}

/** One Appointment Prep symptom from several entries of the same kind. */
export function toSymptom(entries: CalendarEntry[], from: string, to: string, newId: () => string): Symptom {
  const days = [...new Set(entries.map((e) => e.entryDate))].sort();
  const first = days[0];
  const last = days[days.length - 1];
  const span = daysBetween(from, to) + 1;
  const marks = entries.map((e) => e.typical);
  const notes = [...entries]
    .sort((a, b) => a.entryDate.localeCompare(b.entryDate))
    .filter((e) => e.note?.trim())
    .map((e) => `${shortDay(e.entryDate)}: ${e.note!.trim()}`);
  return {
    id: newId(),
    description: describe(entries),
    onset: first === last ? shortDay(first) : `${shortDay(first)} – ${shortDay(last)}`,
    baselineOrNew: marks.includes("new") ? "new" : marks.length && marks.every((m) => m === "typical") ? "baseline" : "new",
    pattern:
      days.length === 1
        ? `Logged once, on ${shortDay(first)}`
        : `Logged ${days.length} of the last ${span} days`,
    reportedBy: reporter(entries),
    trajectory: trajectory(entries),
    notes: notes.join("; ") || undefined,
    calendar: { entryIds: entries.map((e) => e.id) },
  };
}

/** Group picked entries by kind; each group becomes one symptom. */
export function toSymptoms(picked: CalendarEntry[], from: string, to: string, newId: () => string): Symptom[] {
  const groups = new Map<string, CalendarEntry[]>();
  for (const e of picked) groups.set(groupKey(e), [...(groups.get(groupKey(e)) ?? []), e]);
  return [...groups.values()].map((g) => toSymptom(g, from, to, newId));
}

/** Split a merged symptom back into one per entry. */
export function unmerge(entries: CalendarEntry[], from: string, to: string, newId: () => string): Symptom[] {
  return [...entries]
    .sort((a, b) => a.entryDate.localeCompare(b.entryDate))
    .map((e) => toSymptom([e], from, to, newId));
}

/** Medicines written on the picked entries, each once, for the person to
 *  confirm before they join the medication list. */
export function loggedMedicines(picked: CalendarEntry[]): string[] {
  const seen = new Map<string, string>();
  for (const e of picked) {
    const m = e.medicationNote?.trim();
    if (m && !seen.has(m.toLowerCase())) seen.set(m.toLowerCase(), m);
  }
  return [...seen.values()];
}

// ---- The PDF page "From my symptom calendar" ----
// Its words come from here, so a test can check them for words that must
// never appear on it (see calendarWords.test.ts).

const WHO: Record<SymptomReporter, string> = {
  self: "the patient",
  caregiver: "a caregiver",
  both: "the patient and a caregiver",
};

export type CalendarMonth = {
  title: string;
  /** Whole weeks, Sunday first; each day with whether it's in the month. */
  weeks: { key: string; inMonth: boolean; period: boolean; logged: number }[][];
};

export type CalendarPageText = {
  title: string;
  /** "Logged in Voiced by the patient and a caregiver. Not a diagnosis." */
  header: string;
  months: CalendarMonth[];
  legend: string;
  rows: { date: string; what: string; detail: string }[];
  /** Only when periods were brought in. */
  period: { cycles: string[]; days: string[] } | null;
};

function monthsBetween(from: string, to: string): { year: number; month: number }[] {
  const out: { year: number; month: number }[] = [];
  const start = fromDateKey(from);
  const end = fromDateKey(to);
  for (let y = start.getFullYear(), m = start.getMonth(); y < end.getFullYear() || (y === end.getFullYear() && m <= end.getMonth()); ) {
    out.push({ year: y, month: m });
    m += 1;
    if (m === 12) {
      m = 0;
      y += 1;
    }
  }
  return out;
}

export function calendarPageText(
  picked: CalendarEntry[],
  from: string,
  to: string,
  /** An entry's answers in plain words. */
  lines: (e: CalendarEntry) => string[],
  /** Every period, from all the calendar, so cycle lengths reach past the
   *  range picked. */
  cycleList: { start: string; periodDays: number; length: number | null }[]
): CalendarPageText {
  const sorted = [...picked].sort((a, b) => a.entryDate.localeCompare(b.entryDate) || a.loggedAt.localeCompare(b.loggedAt));
  const who = new Set(sorted.map((e) => e.reportedBy));
  const reporter: SymptomReporter = who.size === 1 ? [...who][0] : "both";
  const periodSet = new Set(sorted.filter((e) => e.category === "period" && !e.details.spotting).map((e) => e.entryDate));
  const counts = new Map<string, number>();
  for (const e of sorted) if (!(e.category === "period" && !e.details.spotting)) counts.set(e.entryDate, (counts.get(e.entryDate) ?? 0) + 1);

  const months = monthsBetween(from, to).map(({ year, month }) => {
    const first = new Date(year, month, 1, 12);
    const start = new Date(first);
    start.setDate(1 - first.getDay());
    const last = new Date(year, month + 1, 0, 12);
    const weeks: CalendarMonth["weeks"] = [];
    for (const d = new Date(start); d <= last || d.getDay() !== 0; d.setDate(d.getDate() + 1)) {
      if (d.getDay() === 0) weeks.push([]);
      const key = dateKey(d);
      weeks[weeks.length - 1].push({ key, inMonth: d.getMonth() === month, period: periodSet.has(key), logged: counts.get(key) ?? 0 });
    }
    return { title: first.toLocaleDateString(undefined, { month: "long", year: "numeric" }), weeks };
  });

  const periodsPicked = sorted.filter((e) => e.category === "period");
  const inRange = cycleList.filter((c) => c.start >= addDays(from, -45) && c.start <= to);
  return {
    title: "From my symptom calendar",
    header: `Logged in Voiced by ${WHO[reporter]}. Not a diagnosis.`,
    months,
    legend: "Coral square: a period day.  Dots: how many other things were logged that day.",
    // Period days are in their own block above, not repeated here.
    rows: sorted.filter((e) => e.category !== "period").map((e) => ({
      date: shortDay(e.entryDate),
      what: entryTitle(e),
      detail: [...lines(e), ...(e.note?.trim() ? [`“${e.note.trim()}”`] : [])].join(" · "),
    })),
    period: periodsPicked.length
      ? {
          cycles: inRange.map(
            (c) =>
              `Started ${shortDay(c.start)} · period ${c.periodDays} ${c.periodDays === 1 ? "day" : "days"}${
                c.length !== null ? ` · cycle ${c.length} days` : " · cycle still going"
              }`
          ),
          days: periodsPicked.map((e) => `${shortDay(e.entryDate)}: ${lines(e).join(" · ") || "Period day"}`),
        }
      : null,
  };
}
