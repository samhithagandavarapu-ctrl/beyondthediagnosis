import type { IconName } from "../components/icons/Icon";
import { authEnabled, supabase } from "./supabaseClient";
import type { BodyPartId, FeelingId, PainSpot, SinceId } from "./myVoice";

// The Symptom Calendar: one entry per thing logged on one day.
//
// Signed in, entries are kept in the account (the calendar_entries table — see
// supabase/migrations/20261020_symptom_calendar.sql), which only the owner can
// read: not other users, and not admins. Signed out, or before that table
// exists, they're kept in this browser, and signing in moves them into the
// account — the same way My Voice check-ins and Appointment Prep drafts work.
//
// Calendar data is never sent to the AI assistant or anywhere else.

export type CategoryId =
  | "period"
  | "pain"
  | "mood"
  | "behavior"
  | "sleep"
  | "skin"
  | "eating"
  | "bathroom"
  | "energy"
  | "event"
  | "other";

export type Category = {
  id: CategoryId;
  icon: IconName;
  /** The Easy Read label: "Something hurts". */
  label: string;
  /** One or two words, for the calendar legend and filter chips. */
  short: string;
  /** Which filter chip shows it. */
  filter: FilterId;
};

export const CATEGORIES: Category[] = [
  { id: "period", icon: "drop", label: "My period", short: "Period", filter: "period" },
  { id: "pain", icon: "pain-sharp", label: "Something hurts", short: "Pain", filter: "pain" },
  { id: "mood", icon: "hub-feelings", label: "How I feel", short: "Feelings", filter: "mood" },
  { id: "behavior", icon: "shuffle", label: "Something is different", short: "Different", filter: "mood" },
  { id: "sleep", icon: "moon", label: "How I slept", short: "Sleep", filter: "sleep" },
  { id: "skin", icon: "skin", label: "My skin", short: "Skin", filter: "other" },
  { id: "eating", icon: "utensils", label: "Eating", short: "Eating", filter: "other" },
  { id: "bathroom", icon: "toilet", label: "Bathroom", short: "Bathroom", filter: "other" },
  { id: "energy", icon: "battery", label: "My energy", short: "Energy", filter: "other" },
  { id: "event", icon: "alert", label: "Something scary happened", short: "Scary thing", filter: "other" },
  { id: "other", icon: "plus", label: "Something else", short: "Other", filter: "other" },
];

export function category(id: CategoryId): Category {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1];
}

export type FilterId = "all" | "period" | "pain" | "mood" | "sleep" | "other";

export const FILTERS: { id: FilterId; label: string }[] = [
  { id: "all", label: "All" },
  { id: "period", label: "Period" },
  { id: "pain", label: "Pain" },
  { id: "mood", label: "Mood" },
  { id: "sleep", label: "Sleep" },
  { id: "other", label: "Other" },
];

// ---- Follow-up answers, per category ----

export type EmotionId = "happy" | "sad" | "angry" | "worried" | "tired" | "calm" | "mood-swings" | "dont-know";

export const EMOTIONS: { id: EmotionId; icon: IconName; label: string }[] = [
  { id: "happy", icon: "face-great", label: "Happy" },
  { id: "sad", icon: "face-bad", label: "Sad" },
  { id: "angry", icon: "face-angry", label: "Angry" },
  { id: "worried", icon: "face-worried", label: "Worried" },
  { id: "tired", icon: "face-tired", label: "Tired" },
  { id: "calm", icon: "face-calm", label: "Calm" },
  { id: "mood-swings", icon: "repeat", label: "Mood swings" },
  { id: "dont-know", icon: "question", label: "I don't know" },
];

export type BehaviorId =
  | "irritable"
  | "crying"
  | "withdrawn"
  | "not-usual-things"
  | "hitting"
  | "refusing-out"
  | "clingy";

export const BEHAVIORS: { id: BehaviorId; label: string }[] = [
  { id: "irritable", label: "More irritable" },
  { id: "crying", label: "Crying" },
  { id: "withdrawn", label: "Withdrawn" },
  { id: "not-usual-things", label: "Not wanting to do usual things" },
  { id: "hitting", label: "Hitting or self-hitting" },
  { id: "refusing-out", label: "Refusing to go out" },
  { id: "clingy", label: "More clingy" },
];

export type SkinId = "clear" | "breakouts" | "dry" | "itchy" | "rash";

export const SKIN_CHANGES: { id: SkinId; label: string }[] = [
  { id: "clear", label: "Clear" },
  { id: "breakouts", label: "Breakouts (pimples)" },
  { id: "dry", label: "Dry" },
  { id: "itchy", label: "Itchy" },
  { id: "rash", label: "A rash" },
];

export type SkinPlace = "face" | "chest" | "back" | "arms" | "legs" | "other";

export const SKIN_PLACES: { id: SkinPlace; label: string }[] = [
  { id: "face", label: "Face" },
  { id: "chest", label: "Chest" },
  { id: "back", label: "Back" },
  { id: "arms", label: "Arms" },
  { id: "legs", label: "Legs" },
  { id: "other", label: "Somewhere else" },
];

export type BathroomId = "constipation" | "diarrhea" | "pain-peeing" | "peeing-more";

export const BATHROOM: { id: BathroomId; label: string }[] = [
  { id: "constipation", label: "Hard to poop (constipation)" },
  { id: "diarrhea", label: "Runny poop (diarrhea)" },
  { id: "pain-peeing", label: "It hurts when I pee" },
  { id: "peeing-more", label: "Peeing more often" },
];

export const SLEEP_QUALITY = [
  { id: "good", label: "Good", icon: "face-great" },
  { id: "ok", label: "OK", icon: "face-okay" },
  { id: "bad", label: "Bad", icon: "face-bad" },
] as const;

export const EATING_AMOUNT = [
  { id: "more", label: "More than usual" },
  { id: "usual", label: "Usual" },
  { id: "less", label: "Less than usual" },
] as const;

export const ENERGY_LEVELS = [
  { id: "lots", label: "Lots" },
  { id: "normal", label: "Normal" },
  { id: "low", label: "Very low" },
] as const;

// ---- My period ----

export type FlowId = "little" | "some" | "lot" | "soaked";
export type FlowCounts = Record<FlowId, number>;

/** Pictures of a pad (or tampon, or period underwear) after it's been worn,
 *  with no score and no "heavy" or "normal": the doctor reads the counts. */
export const FLOW_LEVELS: { id: FlowId; label: string; fill: number }[] = [
  { id: "little", label: "Just a little", fill: 0.18 },
  { id: "some", label: "Some", fill: 0.42 },
  { id: "lot", label: "A lot", fill: 0.7 },
  { id: "soaked", label: "Soaked through", fill: 1 },
];

export type FlowProduct = "pad" | "tampon" | "underwear";

export const FLOW_PRODUCTS: { id: FlowProduct; label: string; noun: string }[] = [
  { id: "pad", label: "Pad", noun: "pad" },
  { id: "tampon", label: "Tampon", noun: "tampon" },
  { id: "underwear", label: "Period underwear", noun: "period underwear" },
];

export type ProductId = "pad" | "pad_wings" | "pad_long" | "period_underwear" | "tampon" | "cup" | "other";

export const PRODUCTS: { id: ProductId; label: string }[] = [
  { id: "pad", label: "Pad" },
  { id: "pad_wings", label: "Pad with wings" },
  { id: "pad_long", label: "Long pad" },
  { id: "period_underwear", label: "Period underwear" },
  { id: "tampon", label: "Tampon" },
  { id: "cup", label: "Cup" },
  { id: "other", label: "Something else" },
];

export type ClotSize = "dime" | "quarter" | "bigger";

export const CLOT_SIZES: { id: ClotSize; label: string; px: number }[] = [
  { id: "dime", label: "Smaller than a dime", px: 10 },
  { id: "quarter", label: "About a quarter", px: 18 },
  { id: "bigger", label: "Bigger than a quarter", px: 26 },
];

export const emptyFlow = (): FlowCounts => ({ little: 0, some: 0, lot: 0, soaked: 0 });

/** "2 Some, 1 Soaked through". Empty if nothing was counted. */
export function flowWords(flow: FlowCounts | undefined): string {
  if (!flow) return "";
  return FLOW_LEVELS.filter((l) => flow[l.id] > 0)
    .map((l) => `${flow[l.id]} ${l.label}`)
    .join(", ");
}

/** A period day, rather than spotting between periods. */
export function isPeriodDay(e: CalendarEntry): boolean {
  return e.category === "period" && !e.details.spotting;
}

export type EntryDetails = {
  // How I feel (and My Voice check-ins)
  overall?: FeelingId;
  feelings?: EmotionId[];
  since?: SinceId;
  hasVoiceNote?: boolean;
  /** From Practice My Visit: their approved sentences. */
  ownWords?: string[];
  /** Simple body parts from Practice My Visit. */
  bodyParts?: BodyPartId[];
  // Something hurts
  spots?: PainSpot[];
  // Something is different
  changes?: BehaviorId[];
  // How I slept
  sleepQuality?: (typeof SLEEP_QUALITY)[number]["id"];
  wokeUpALot?: boolean;
  sleepyInDay?: boolean;
  // Eating
  eatingAmount?: (typeof EATING_AMOUNT)[number]["id"];
  tummyUpset?: boolean;
  throwingUp?: boolean;
  // Bathroom
  bathroom?: BathroomId[];
  // My skin
  skin?: SkinId[];
  skinPlaces?: SkinPlace[];
  // My energy
  energy?: (typeof ENERGY_LEVELS)[number]["id"];
  // Something scary happened
  whatHappened?: string;
  howLong?: string;
  // My period
  /** "Is this the first day of your period?" Yes starts a new cycle. */
  firstDay?: boolean;
  /** Bleeding between periods; not counted as a period day. */
  spotting?: boolean;
  /** How many of each picture they tapped +1 on that day. */
  flow?: FlowCounts;
  /** Which pictures they were looking at. */
  flowProduct?: FlowProduct;
  products?: ProductId[];
  leak?: boolean;
  /** Blobs (clots), and how big; "none" if they said no. */
  clots?: ClotSize | "none";
  /** Other: the custom symptom it was logged under, if any. */
  customSymptomId?: string;
};

export type SeverityScale = "faces" | "ten" | "five";
export type Typical = "typical" | "new" | "unsure";
export type ReportedBy = "self" | "caregiver" | "both";

export const REPORTED_BY: { id: ReportedBy; label: string; icon: IconName }[] = [
  { id: "self", label: "Me", icon: "person" },
  { id: "caregiver", label: "My caregiver", icon: "doctor" },
  { id: "both", label: "Both of us", icon: "heart" },
];

export const STRENGTH_FACES: { level: 1 | 2 | 3; label: string; icon: IconName; tone: string }[] = [
  { level: 1, label: "A little", icon: "face-okay", tone: "bg-butter/40" },
  { level: 2, label: "Medium", icon: "face-bad", tone: "bg-coral/30" },
  { level: 3, label: "A lot", icon: "face-awful", tone: "bg-coral/50" },
];

export type CalendarEntry = {
  id: string;
  /** The day it happened, in the person's own time zone: "2026-10-20". */
  entryDate: string;
  loggedAt: string;
  category: CategoryId;
  customLabel: string | null;
  severity: number | null;
  severityScale: SeverityScale | null;
  typical: Typical | null;
  reportedBy: ReportedBy;
  bodyLocations: string[] | null;
  details: EntryDetails;
  medicationNote: string | null;
  note: string | null;
  addToVisit: boolean;
  /** Entries saved from one My Voice check-in share this. */
  checkInId: string | null;
  updatedAt: string;
  /** "Just for me": linked grown-ups don't see it. Only the owner sets it. */
  private: boolean;
  /** Whose calendar it's in, once it's in an account (null on this device). */
  userId: string | null;
  /** Who wrote it: the owner, or a linked grown-up. Null means the owner. */
  loggedBy: string | null;
};

export type CustomSymptom = { id: string; label: string; icon: IconName; createdAt: string };

export function newEntry(patch: Partial<CalendarEntry> = {}): CalendarEntry {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    entryDate: dateKey(new Date()),
    loggedAt: now,
    category: "other",
    customLabel: null,
    severity: null,
    severityScale: null,
    typical: null,
    reportedBy: "self",
    bodyLocations: null,
    details: {},
    medicationNote: null,
    note: null,
    addToVisit: false,
    checkInId: null,
    updatedAt: now,
    private: false,
    userId: null,
    loggedBy: null,
    ...patch,
  };
}

// ---- Dates, always in the person's own time zone ----

const pad = (n: number) => String(n).padStart(2, "0");

/** "2026-10-20" for a local date. */
export function dateKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** The local Date for a "2026-10-20" key (midday, so DST never shifts it). */
export function fromDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d, 12);
}

export const todayKey = () => dateKey(new Date());

/** "Tuesday, October 20". */
export function longDate(key: string): string {
  return fromDateKey(key).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
}

export function sortEntries(list: CalendarEntry[]): CalendarEntry[] {
  return [...list].sort(
    (a, b) => b.entryDate.localeCompare(a.entryDate) || b.loggedAt.localeCompare(a.loggedAt)
  );
}

// ---- This device ----

const LOCAL_ENTRIES = "voiced:calendar-entries";
const LOCAL_SYMPTOMS = "voiced:custom-symptoms";

function readLocal<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

function writeLocal<T>(key: string, list: T[]) {
  try {
    if (list.length) localStorage.setItem(key, JSON.stringify(list));
    else localStorage.removeItem(key);
  } catch {
    // Full or blocked storage just means nothing is kept on this device.
  }
}

// ---- The account ----

type EntryRow = {
  id: string;
  entry_date: string;
  logged_at: string;
  category: CategoryId;
  custom_label: string | null;
  severity: number | null;
  severity_scale: SeverityScale | null;
  typical: Typical | null;
  reported_by: ReportedBy;
  body_locations: string[] | null;
  details: EntryDetails | null;
  medication_note: string | null;
  note: string | null;
  add_to_visit: boolean;
  check_in_id: string | null;
  updated_at: string;
  private: boolean | null;
  user_id: string;
  logged_by: string | null;
};

const ENTRY_COLUMNS =
  "id, entry_date, logged_at, category, custom_label, severity, severity_scale, typical, reported_by, body_locations, details, medication_note, note, add_to_visit, check_in_id, updated_at, private, user_id, logged_by";

const fromRow = (r: EntryRow): CalendarEntry => ({
  id: r.id,
  entryDate: r.entry_date,
  loggedAt: r.logged_at,
  category: r.category,
  customLabel: r.custom_label,
  severity: r.severity,
  severityScale: r.severity_scale,
  typical: r.typical,
  reportedBy: r.reported_by,
  bodyLocations: r.body_locations,
  details: r.details ?? {},
  medicationNote: r.medication_note,
  note: r.note,
  addToVisit: r.add_to_visit,
  checkInId: r.check_in_id,
  updatedAt: r.updated_at,
  private: !!r.private,
  userId: r.user_id,
  loggedBy: r.logged_by,
});

// updated_at is left to the table's trigger. Whose calendar and who wrote it
// go only when known: the table fills them in for a new entry (the person
// saving it), and never lets them change afterwards.
const toRow = (e: CalendarEntry) => ({
  ...(e.userId ? { user_id: e.userId } : {}),
  ...(e.loggedBy ? { logged_by: e.loggedBy } : {}),
  private: !!e.private,
  id: e.id,
  entry_date: e.entryDate,
  logged_at: e.loggedAt,
  category: e.category,
  custom_label: e.customLabel,
  severity: e.severity,
  severity_scale: e.severityScale,
  typical: e.typical,
  reported_by: e.reportedBy,
  body_locations: e.bodyLocations,
  details: e.details,
  medication_note: e.medicationNote,
  note: e.note,
  add_to_visit: e.addToVisit,
  check_in_id: e.checkInId,
});

export type CalendarStore = "account" | "device";

/** Every entry for whoever is here, newest first, and where they live.
 *  `accountMissing` is true when someone is signed in but the account can't
 *  hold entries yet (the SQL hasn't been run), so they're on this device. */
export async function listEntries(
  userId: string | null
): Promise<{ entries: CalendarEntry[]; store: CalendarStore; accountMissing: boolean }> {
  const local = readLocal<CalendarEntry>(LOCAL_ENTRIES);
  if (!userId || !authEnabled) {
    return { entries: sortEntries(local), store: "device", accountMissing: false };
  }

  // Bring anything made on this device into the account first.
  if (local.length) {
    const { error } = await supabase
      .from("calendar_entries")
      .upsert(local.map(toRow), { onConflict: "id" });
    if (!error) writeLocal(LOCAL_ENTRIES, []);
  }

  const { data, error } = await supabase
    .from("calendar_entries")
    .select(ENTRY_COLUMNS)
    // Only this person's own calendar: a linked grown-up can also read their
    // children's, and those must never mix in here.
    .eq("user_id", userId)
    .order("entry_date", { ascending: false });
  if (error) {
    console.error("Couldn't load the calendar from the account:", error.message);
    return { entries: sortEntries(readLocal(LOCAL_ENTRIES)), store: "device", accountMissing: true };
  }
  return { entries: sortEntries((data as EntryRow[]).map(fromRow)), store: "account", accountMissing: false };
}

/** Save new or changed entries where they live. Returns where they went: if
 *  the account can't take them, they're kept on this device instead of lost. */
export async function saveEntries(userId: string | null, entries: CalendarEntry[]): Promise<CalendarStore> {
  if (!entries.length) return userId ? "account" : "device";
  if (userId && authEnabled) {
    const { error } = await supabase
      .from("calendar_entries")
      .upsert(entries.map(toRow), { onConflict: "id" });
    if (!error) return "account";
    console.error("Couldn't save to the calendar in the account:", error.message);
  }
  const ids = new Set(entries.map((e) => e.id));
  writeLocal(LOCAL_ENTRIES, [...entries, ...readLocal<CalendarEntry>(LOCAL_ENTRIES).filter((e) => !ids.has(e.id))]);
  return "device";
}

// ---- A linked child's calendar (for their grown-ups) ----
// Account only, and never mixed into the grown-up's own calendar on this
// device. The database leaves out anything the child marked "Just for me".

export async function listEntriesOf(childId: string): Promise<CalendarEntry[]> {
  if (!authEnabled) return [];
  const { data, error } = await supabase
    .from("calendar_entries")
    .select(ENTRY_COLUMNS)
    .eq("user_id", childId)
    .order("entry_date", { ascending: false });
  if (error) {
    console.error("Couldn't load that calendar:", error.message);
    return [];
  }
  return sortEntries((data as EntryRow[]).map(fromRow));
}

export async function listCustomSymptomsOf(childId: string): Promise<CustomSymptom[]> {
  if (!authEnabled) return [];
  const { data, error } = await supabase
    .from("custom_symptoms")
    .select("id, label, icon, created_at")
    .eq("user_id", childId);
  if (error) return [];
  return (data as SymptomRow[]).map((r) => ({ id: r.id, label: r.label, icon: r.icon, createdAt: r.created_at }));
}

/** A grown-up adding to (or changing their own entry in) a child's calendar.
 *  Only ever saved to the account: if that fails, it isn't kept anywhere. */
export async function saveEntryFor(childId: string, me: string, entry: CalendarEntry): Promise<{ error: string | null }> {
  const row = toRow({ ...entry, userId: childId, loggedBy: me, private: false });
  const { error } = await supabase.from("calendar_entries").upsert(row, { onConflict: "id" });
  return { error: error ? "Couldn't save that to their calendar. Please try again." : null };
}

/** Real deletes, from this device and from the account. */
export async function deleteEntries(userId: string | null, ids: string[]): Promise<void> {
  if (!ids.length) return;
  const gone = new Set(ids);
  writeLocal(LOCAL_ENTRIES, readLocal<CalendarEntry>(LOCAL_ENTRIES).filter((e) => !gone.has(e.id)));
  if (userId && authEnabled) {
    const { error } = await supabase.from("calendar_entries").delete().in("id", ids);
    if (error) console.error("Couldn't delete from the calendar in the account:", error.message);
  }
}

// ---- Custom symptoms ("Something else" that comes back as a quick button) ----

type SymptomRow = { id: string; label: string; icon: IconName; created_at: string };

export async function listCustomSymptoms(userId: string | null): Promise<CustomSymptom[]> {
  const local = readLocal<CustomSymptom>(LOCAL_SYMPTOMS);
  if (!userId || !authEnabled) return local;
  if (local.length) {
    const { error } = await supabase.from("custom_symptoms").upsert(
      local.map((s) => ({ id: s.id, label: s.label, icon: s.icon, created_at: s.createdAt })),
      { onConflict: "id" }
    );
    if (!error) writeLocal(LOCAL_SYMPTOMS, []);
  }
  const { data, error } = await supabase
    .from("custom_symptoms")
    .select("id, label, icon, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) return readLocal(LOCAL_SYMPTOMS);
  return (data as SymptomRow[]).map((r) => ({ id: r.id, label: r.label, icon: r.icon, createdAt: r.created_at }));
}

export async function addCustomSymptom(userId: string | null, symptom: CustomSymptom): Promise<void> {
  if (userId && authEnabled) {
    const { error } = await supabase
      .from("custom_symptoms")
      .insert({ id: symptom.id, label: symptom.label, icon: symptom.icon, created_at: symptom.createdAt });
    if (!error) return;
  }
  writeLocal(LOCAL_SYMPTOMS, [...readLocal<CustomSymptom>(LOCAL_SYMPTOMS), symptom]);
}

// ---- Entries in plain words (day cards, the review screen, screen readers) ----

const SINCE_WORDS: Record<SinceId, string> = {
  today: "Started today",
  "few-days": "Started a few days ago",
  "week-plus": "Started a week or more ago",
};

const labelOf = <T extends { id: string; label: string }>(list: readonly T[], id: string | undefined) =>
  list.find((x) => x.id === id)?.label ?? "";

/** Its picture: the custom symptom's own, or the category's. */
export function entryIcon(e: CalendarEntry, customs: CustomSymptom[]): IconName {
  const own = e.details.customSymptomId && customs.find((s) => s.id === e.details.customSymptomId);
  return own ? own.icon : category(e.category).icon;
}

/** What it's called: the category, or the custom symptom's own name. */
export function entryTitle(e: CalendarEntry): string {
  return e.customLabel?.trim() || category(e.category).label;
}

/** "A lot", "7 out of 10", "4 out of 5". Empty if no strength was given. */
export function strengthWords(e: CalendarEntry): string {
  if (e.severity === null || !e.severityScale) return "";
  if (e.severityScale === "faces") return STRENGTH_FACES.find((f) => f.level === e.severity)?.label ?? "";
  return `${e.severity} out of ${e.severityScale === "ten" ? 10 : 5}`;
}

/** The answers to the category's own questions, one line each. */
export function detailLines(e: CalendarEntry, feelingWord: (id: FeelingId) => string, spotLine: (s: PainSpot) => string): string[] {
  const d = e.details;
  const yes = (on: boolean | undefined, words: string) => (on ? [words] : []);
  switch (e.category) {
    case "mood":
      return [
        ...(d.overall ? [`Overall: ${feelingWord(d.overall)}`] : []),
        ...(d.feelings?.length ? [`Feelings: ${d.feelings.map((f) => labelOf(EMOTIONS, f)).join(", ")}`] : []),
        ...(d.ownWords ?? []),
      ];
    case "pain":
      return (d.spots ?? []).map(spotLine);
    case "behavior":
      return d.changes?.length ? [d.changes.map((c) => labelOf(BEHAVIORS, c)).join(", ")] : [];
    case "sleep":
      return [
        ...(d.sleepQuality ? [`Sleep: ${labelOf(SLEEP_QUALITY, d.sleepQuality)}`] : []),
        ...yes(d.wokeUpALot, "Woke up a lot"),
        ...yes(d.sleepyInDay, "Very sleepy in the daytime"),
      ];
    case "eating":
      return [
        ...(d.eatingAmount ? [labelOf(EATING_AMOUNT, d.eatingAmount)] : []),
        ...yes(d.tummyUpset, "Tummy upset"),
        ...yes(d.throwingUp, "Throwing up"),
      ];
    case "skin":
      return [
        ...(d.skin?.length ? [d.skin.map((x) => labelOf(SKIN_CHANGES, x)).join(", ")] : []),
        ...(d.skinPlaces?.length ? [`Where: ${d.skinPlaces.map((x) => labelOf(SKIN_PLACES, x)).join(", ")}`] : []),
      ];
    case "bathroom":
      return d.bathroom?.length ? [d.bathroom.map((b) => labelOf(BATHROOM, b)).join(", ")] : [];
    case "energy":
      return d.energy ? [`Energy: ${d.energy === "normal" ? "Usual" : labelOf(ENERGY_LEVELS, d.energy)}`] : [];
    case "period":
      return [
        ...(d.spotting ? ["Spotting (between periods)"] : d.firstDay ? ["First day of my period"] : []),
        ...(flowWords(d.flow)
          ? [`${labelOf(FLOW_PRODUCTS, d.flowProduct ?? "pad")}: ${flowWords(d.flow)}`]
          : []),
        ...(d.products?.length ? [`Used: ${d.products.map((p) => labelOf(PRODUCTS, p)).join(", ")}`] : []),
        ...(d.leak === true ? ["Leaked on my clothes"] : d.leak === false ? ["No leaks"] : []),
        ...(d.clots && d.clots !== "none"
          ? [`Blobs (clots): ${labelOf(CLOT_SIZES, d.clots).toLowerCase()}`]
          : d.clots === "none"
            ? ["No blobs (clots)"]
            : []),
      ];
    case "event":
      return [
        ...(d.whatHappened?.trim() ? [d.whatHappened.trim()] : []),
        ...(d.howLong?.trim() ? [`How long: ${d.howLong.trim()}`] : []),
      ];
    default:
      return [];
  }
}

const FOR_DOCTOR: Record<ReportedBy, string> = {
  self: "The patient",
  caregiver: "A caregiver",
  both: "The patient and a caregiver",
};

/** Everything else about an entry, after its own answers. `forDoctor` names
 *  who told it the way a clinician reads it ("The patient", not "Me"). */
export function aboutLines(
  e: CalendarEntry,
  forDoctor = false,
  /** Who told it, worded for someone other than the owner (a linked
   *  grown-up looking at a child's calendar). */
  teller?: (e: CalendarEntry) => string
): string[] {
  const strength = e.category === "pain" ? "" : strengthWords(e);
  return [
    ...(strength ? [`How strong: ${strength}`] : []),
    ...(e.details.since ? [SINCE_WORDS[e.details.since]] : []),
    ...(e.typical === "new" ? ["New or different for me"] : e.typical === "typical" ? ["Usual for me"] : []),
    `Told by: ${teller ? teller(e) : forDoctor ? FOR_DOCTOR[e.reportedBy] : labelOf(REPORTED_BY, e.reportedBy)}`,
    ...(e.medicationNote?.trim() ? [`Medicine taken: ${e.medicationNote.trim()}`] : []),
    ...(e.details.hasVoiceNote ? ["Recorded a voice note"] : []),
  ];
}

/** "October 14, period, pain, logged by caregiver": a calendar day, read out. */
export function dayAriaLabel(key: string, entries: CalendarEntry[]): string {
  const day = fromDateKey(key).toLocaleDateString(undefined, { month: "long", day: "numeric" });
  if (!entries.length) return `${day}, nothing logged`;
  const what = [...new Set(entries.map((e) => entryTitle(e).toLowerCase()))].join(", ");
  const who = [...new Set(entries.map((e) => labelOf(REPORTED_BY, e.reportedBy).toLowerCase()))]
    .map((w) => (w === "me" ? "by me" : `by ${w.replace(/^my /, "")}`))
    .join(" and ");
  return `${day}, ${what}, logged ${who}`;
}

// ---- The family's own data: export and delete ----

/** Removes every custom symptom, here and in the account. */
export async function deleteCustomSymptoms(userId: string | null): Promise<void> {
  writeLocal(LOCAL_SYMPTOMS, []);
  if (userId && authEnabled) {
    const { error } = await supabase.from("custom_symptoms").delete().eq("user_id", userId);
    if (error) console.error("Couldn't delete custom symptoms from the account:", error.message);
  }
}

/** The little things the calendar remembers on this device. */
export function clearCalendarDeviceSettings(periodOnly: boolean) {
  const keys = ["voiced:calendar-usual-products", "voiced:period-bag"];
  if (!periodOnly) keys.push("voiced:calendar-reported-by", "voiced:calendar-privacy-seen");
  try {
    keys.forEach((k) => localStorage.removeItem(k));
  } catch {
    // ignore
  }
}

const csvCell = (v: unknown) => {
  const text = v === null || v === undefined ? "" : String(v);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

/** "Download my calendar": every entry as a CSV row, in plain words. */
export function calendarCsv(entries: CalendarEntry[], answers: (e: CalendarEntry) => string[]): string {
  const header = [
    "date",
    "logged at",
    "category",
    "name",
    "answers",
    "strength",
    "usual or new",
    "told by",
    "medicine",
    "note",
    "saved for visit",
    "from My Voice check-in",
  ];
  const rows = [...entries]
    .sort((a, b) => a.entryDate.localeCompare(b.entryDate) || a.loggedAt.localeCompare(b.loggedAt))
    .map((e) => [
      e.entryDate,
      e.loggedAt,
      e.category,
      entryTitle(e),
      answers(e).join("; "),
      strengthWords(e),
      e.typical === "new" ? "new or different" : e.typical === "typical" ? "usual for me" : "",
      labelOf(REPORTED_BY, e.reportedBy),
      e.medicationNote ?? "",
      e.note ?? "",
      e.addToVisit ? "yes" : "",
      e.checkInId ? "yes" : "",
    ]);
  return [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n");
}

/** "Delete all my period data" (periodOnly) or "Delete my whole calendar":
 *  real deletes, on this device and in the account, of this person's own
 *  calendar only. */
export async function deleteAllEntries(userId: string | null, periodOnly: boolean): Promise<boolean> {
  writeLocal(
    LOCAL_ENTRIES,
    periodOnly ? readLocal<CalendarEntry>(LOCAL_ENTRIES).filter((e) => e.category !== "period") : []
  );
  if (!userId || !authEnabled) return true;
  // Only this person's own calendar, never entries they wrote in a child's.
  const query = supabase.from("calendar_entries").delete().eq("user_id", userId);
  const { error } = periodOnly ? await query.eq("category", "period") : await query;
  if (error) {
    console.error("Couldn't delete from the calendar in the account:", error.message);
    return false;
  }
  return true;
}
