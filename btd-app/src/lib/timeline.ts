import type { IconName } from "../components/icons/Icon";

// The Symptom Timeline: what changed, when, and what else changed around the
// same time. It exists because new symptoms in people with Down syndrome are
// so often put down to "just the Down syndrome" — a timeline puts the change
// next to everything else that happened, so it can't be waved away.
//
// It is part of the Appointment Prep form, so it is saved exactly the way the
// rest of the form is: on this device, never uploaded.

export type TimelineType = "change" | "skill" | "medication" | "illness" | "test" | "life";
export type Compared = "" | "not-like-them" | "little-different" | "about-same";
export type Impact = "" | "none" | "some" | "a-lot";
export type Frequency = "" | "once" | "comes-and-goes" | "every-day" | "more-often";
export type Ongoing = "" | "yes" | "no";
export type Noticer = "" | "self" | "parent" | "sibling" | "staff" | "teacher" | "doctor" | "other";

export type TimelineEntry = {
  id: string;
  type: TimelineType;
  /** From the "areas to think about" checklist, if the entry started there. */
  area: string;
  dateMode: "exact" | "approx";
  /** yyyy-mm-dd, when dateMode is "exact". */
  date: string;
  /** Free text when dateMode is "approx": "around March 2026", "after the move". */
  approxText: string;
  /** yyyy-mm. Worked out from approxText when it can be; otherwise picked by
   *  hand. Only used to put approximate entries in order. */
  approxMonth: string;
  description: string;
  compared: Compared;
  impact: Impact;
  frequency: Frequency;
  ongoing: Ongoing;
  stoppedWhen: string;
  noticedBy: Noticer;
  noticedByOther: string;
  notes: string;
};

export type Timeline = {
  /** What the person is like on a typical good day — the baseline. */
  usualSelf: string;
  entries: TimelineEntry[];
};

export const emptyTimeline = (): Timeline => ({ usualSelf: "", entries: [] });

export function newEntry(patch: Partial<TimelineEntry> = {}): TimelineEntry {
  return {
    id: crypto.randomUUID(),
    type: "change",
    area: "",
    dateMode: "approx",
    date: "",
    approxText: "",
    approxMonth: "",
    description: "",
    compared: "",
    impact: "",
    frequency: "",
    ongoing: "",
    stoppedWhen: "",
    noticedBy: "",
    noticedByOther: "",
    notes: "",
    ...patch,
  };
}

// ---- Labels ----
// Every type has an icon AND a word, so nothing depends on colour alone.

export const TIMELINE_TYPES: { id: TimelineType; label: string; short: string; icon: IconName; hint: string }[] = [
  {
    id: "change",
    label: "Symptom or change noticed",
    short: "Change noticed",
    icon: "tl-change",
    hint: "Something new, or something getting better or worse",
  },
  {
    id: "skill",
    label: "Lost skill or ability",
    short: "Lost skill",
    icon: "tl-skill",
    hint: "For example, stopped dressing themselves, talking less, new trouble with stairs",
  },
  {
    id: "medication",
    label: "Medication change",
    short: "Medication change",
    icon: "tl-medication",
    hint: "Started, stopped, or a dose changed",
  },
  {
    id: "illness",
    label: "Illness, injury, ER visit, or hospital stay",
    short: "Illness or injury",
    icon: "tl-illness",
    hint: "Being sick or hurt, or a trip to the ER or hospital",
  },
  {
    id: "test",
    label: "Test, appointment, or something ruled out",
    short: "Test or appointment",
    icon: "tl-test",
    hint: "Include the result if you know it",
  },
  {
    id: "life",
    label: "Life change",
    short: "Life change",
    icon: "tl-life",
    hint: "A move, new or lost caregiver or staff, someone close dying, a change in school, job, day program, or routine",
  },
];

export const timelineType = (id: TimelineType) =>
  TIMELINE_TYPES.find((t) => t.id === id) ?? TIMELINE_TYPES[0];

export const COMPARED_OPTIONS: { id: Exclude<Compared, "">; label: string }[] = [
  { id: "not-like-them", label: "Not like them at all" },
  { id: "little-different", label: "A little different" },
  { id: "about-same", label: "About the same" },
];

export const IMPACT_OPTIONS: { id: Exclude<Impact, "">; label: string }[] = [
  { id: "none", label: "None" },
  { id: "some", label: "Some" },
  { id: "a-lot", label: "A lot" },
];

export const FREQUENCY_OPTIONS: { id: Exclude<Frequency, "">; label: string }[] = [
  { id: "once", label: "Once" },
  { id: "comes-and-goes", label: "Comes and goes" },
  { id: "every-day", label: "Every day" },
  { id: "more-often", label: "Happening more often" },
];

export const NOTICER_OPTIONS: { id: Exclude<Noticer, "">; label: string }[] = [
  { id: "self", label: "They did (themselves)" },
  { id: "parent", label: "Parent" },
  { id: "sibling", label: "Brother or sister" },
  { id: "staff", label: "Staff or support worker" },
  { id: "teacher", label: "Teacher" },
  { id: "doctor", label: "Doctor or nurse" },
  { id: "other", label: "Someone else" },
];

/** Memory prompts only — never a hint at what might be wrong. */
export const AREAS = [
  "Sleep",
  "Eating or weight",
  "Mood",
  "Energy",
  "Communication",
  "Daily skills",
  "Memory",
  "Hearing",
  "Vision",
  "Bathroom habits",
  "Pain",
  "Moving or walking",
];

const labelOf = <T extends string>(list: { id: T; label: string }[], id: T | "") =>
  list.find((o) => o.id === id)?.label ?? "";

export const comparedLabel = (v: Compared) => labelOf(COMPARED_OPTIONS, v);
export const impactLabel = (v: Impact) => labelOf(IMPACT_OPTIONS, v);
export const frequencyLabel = (v: Frequency) => labelOf(FREQUENCY_OPTIONS, v);
export function noticedByLabel(e: TimelineEntry) {
  if (e.noticedBy === "other") return e.noticedByOther.trim() || "Someone else";
  return labelOf(NOTICER_OPTIONS, e.noticedBy);
}

// ---- Dates ----

const MONTHS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

// Northern-hemisphere middles; only used to put entries in order.
const SEASON_MONTH: Record<string, number> = {
  winter: 1,
  spring: 4,
  summer: 7,
  fall: 10,
  autumn: 10,
};

const pad = (n: number) => String(n).padStart(2, "0");

/** Best guess at a yyyy-mm for things people actually type: "around March
 *  2026", "mar 2026", "summer 2025", "early 2024", "2023", "3/2026". Returns ""
 *  when there's nothing to go on ("after the move"). */
export function guessMonth(text: string): string {
  const t = text.toLowerCase();
  const yearMatch = t.match(/\b(19|20)\d{2}\b/);

  const numeric = t.match(/\b(\d{1,2})\s*[/.-]\s*((?:19|20)\d{2})\b/);
  if (numeric) {
    const m = Number(numeric[1]);
    if (m >= 1 && m <= 12) return `${numeric[2]}-${pad(m)}`;
  }

  if (!yearMatch) return "";
  const year = yearMatch[0];

  // Full name or the usual short form ("mar", "sept"), as a whole word.
  const monthIndex = MONTHS.findIndex((m) =>
    new RegExp(`\\b(${m}|${m.slice(0, 3)}${m === "september" ? "|sept" : ""})\\b`).test(t)
  );
  if (monthIndex >= 0) return `${year}-${pad(monthIndex + 1)}`;

  const season = Object.keys(SEASON_MONTH).find((s) => t.includes(s));
  if (season) return `${year}-${pad(SEASON_MONTH[season])}`;

  if (/\bearly\b|\bbeginning\b|\bstart\b/.test(t)) return `${year}-02`;
  if (/\blate\b|\bend\b/.test(t)) return `${year}-11`;
  if (/\bmid/.test(t)) return `${year}-06`;
  return `${year}-06`;
}

/** Days since 1970 for sorting, or null when the entry has no usable date. */
export function sortKey(e: TimelineEntry): number | null {
  if (e.dateMode === "exact" && e.date) {
    const d = Date.parse(`${e.date}T12:00:00Z`);
    return Number.isNaN(d) ? null : Math.floor(d / 86_400_000);
  }
  const month = e.approxMonth || guessMonth(e.approxText);
  if (!month) return null;
  const d = Date.parse(`${month}-15T12:00:00Z`);
  return Number.isNaN(d) ? null : Math.floor(d / 86_400_000);
}

function monthName(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  if (!y || !m) return "";
  return new Date(Date.UTC(y, m - 1, 15)).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** How the entry's date is written on screen and on the PDF. */
export function dateLabel(e: TimelineEntry): string {
  if (e.dateMode === "exact" && e.date) {
    const d = new Date(`${e.date}T12:00:00Z`);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString(undefined, {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      });
    }
  }
  if (e.approxText.trim()) return e.approxText.trim();
  if (e.approxMonth) return `Around ${monthName(e.approxMonth)}`;
  return "Date not known";
}

/** The month heading an entry is grouped under. */
export function monthGroup(e: TimelineEntry): string {
  const key = sortKey(e);
  if (key === null) return "Date not known";
  const d = new Date(key * 86_400_000);
  return d.toLocaleDateString(undefined, { month: "long", year: "numeric", timeZone: "UTC" });
}

/** Entries worth showing: anything with a description. */
export function filledEntries(t: Timeline | undefined): TimelineEntry[] {
  return (t?.entries ?? []).filter((e) => e.description.trim());
}

/** Oldest first; entries with no date go last, in the order they were added. */
export function sortEntries(entries: TimelineEntry[], newestFirst = false): TimelineEntry[] {
  const dated = entries.filter((e) => sortKey(e) !== null);
  const undated = entries.filter((e) => sortKey(e) === null);
  dated.sort((a, b) => (sortKey(a) as number) - (sortKey(b) as number));
  if (newestFirst) dated.reverse();
  return [...dated, ...undated];
}

/** Within about 4 weeks of each other. Approximate dates are fuzzy, so this
 *  is "worth a look", never "one caused the other". */
const NEAR_DAYS = 28;

/** For each entry id, the other entries that happened around the same time. */
export function nearbyEntries(entries: TimelineEntry[]): Map<string, TimelineEntry[]> {
  const result = new Map<string, TimelineEntry[]>();
  const dated = entries.filter((e) => e.description.trim() && sortKey(e) !== null);
  for (const a of dated) {
    const near = dated.filter(
      (b) => b.id !== a.id && Math.abs((sortKey(a) as number) - (sortKey(b) as number)) <= NEAR_DAYS
    );
    if (near.length) result.set(a.id, near);
  }
  return result;
}

/** The ones a busy doctor should see first. */
export function isBigChange(e: TimelineEntry) {
  return e.compared === "not-like-them" || e.impact === "a-lot";
}

/** The detail line under an entry: how it compares, how much, how often, etc. */
export function entryDetails(e: TimelineEntry): string[] {
  const parts: string[] = [];
  if (e.area) parts.push(`Area: ${e.area}`);
  if (e.compared) parts.push(`Compared with usual: ${comparedLabel(e.compared)}`);
  if (e.impact) parts.push(`Effect on daily life: ${impactLabel(e.impact)}`);
  if (e.frequency) parts.push(`How often: ${frequencyLabel(e.frequency)}`);
  if (e.ongoing === "yes") parts.push("Still happening");
  if (e.ongoing === "no") parts.push(e.stoppedWhen.trim() ? `Stopped ${e.stoppedWhen.trim()}` : "Stopped");
  const who = noticedByLabel(e);
  if (who) parts.push(`Noticed by: ${who}`);
  return parts;
}

export function timelineIsEmpty(t: Timeline | undefined) {
  return !t || (!t.usualSelf.trim() && filledEntries(t).length === 0);
}

/** Months grouped in date order, for the PDF and the printed summary. */
export function groupByMonth(entries: TimelineEntry[]): { month: string; entries: TimelineEntry[] }[] {
  const groups: { month: string; entries: TimelineEntry[] }[] = [];
  for (const e of sortEntries(entries)) {
    const month = monthGroup(e);
    const last = groups[groups.length - 1];
    if (last && last.month === month) last.entries.push(e);
    else groups.push({ month, entries: [e] });
  }
  return groups;
}
