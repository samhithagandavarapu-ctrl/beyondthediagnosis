import { authEnabled, supabase } from "./supabaseClient";
import { CheckIn, PainReport, normalizeCheckIn, sortCheckIns } from "./myVoice";
import {
  CalendarEntry,
  CalendarStore,
  dateKey,
  deleteEntries,
  listEntries,
  listEntriesOf,
  newEntry,
  saveEntries,
} from "./calendar";

// My Voice check-ins live in the Symptom Calendar. Each one is saved as a
// "How I feel" entry and, if they marked the body map, a "Something hurts"
// entry on the day it was made; the two share a check_in_id, so My Voice can
// show, change and delete them as one check-in. Where they're kept (account
// or this device) is up to lib/calendar.ts.

export type CheckInStore = CalendarStore;

// ---- A check-in, as calendar entries, and back ----

export function checkInToEntries(c: CheckIn): CalendarEntry[] {
  const spots = c.pain ?? [];
  const day = dateKey(new Date(c.createdAt));
  const base = {
    entryDate: day,
    loggedAt: c.createdAt,
    updatedAt: c.updatedAt ?? c.createdAt,
    reportedBy: "self" as const,
    checkInId: c.id,
    private: !!c.private,
  };
  const hasMood =
    !!c.overall ||
    !!c.feelings?.length ||
    c.hasVoiceNote ||
    !!c.ownWords?.length ||
    c.bodyParts.length > 0 ||
    spots.length === 0;
  const note = c.note.trim() || null;
  const out: CalendarEntry[] = [];

  if (hasMood) {
    out.push(
      newEntry({
        ...base,
        id: c.entryIds?.mood ?? crypto.randomUUID(),
        category: "mood",
        note,
        details: {
          ...(c.overall ? { overall: c.overall } : {}),
          ...(c.feelings?.length ? { feelings: c.feelings } : {}),
          ...(c.since ? { since: c.since } : {}),
          ...(c.hasVoiceNote ? { hasVoiceNote: true } : {}),
          ...(c.ownWords?.length ? { ownWords: c.ownWords } : {}),
          ...(c.bodyParts.length ? { bodyParts: c.bodyParts } : {}),
        },
      })
    );
  }
  if (spots.length) {
    const worst = Math.max(0, ...spots.map((s) => s.level ?? 0));
    out.push(
      newEntry({
        ...base,
        id: c.entryIds?.pain ?? crypto.randomUUID(),
        category: "pain",
        bodyLocations: spots.map((s) => s.area),
        severity: worst || null,
        severityScale: worst ? "five" : null,
        note: hasMood ? null : note,
        details: { spots, ...(c.since ? { since: c.since } : {}) },
      })
    );
  }
  return out;
}

/** Calendar entries that came from check-ins, put back together. */
export function entriesToCheckIns(entries: CalendarEntry[]): CheckIn[] {
  const groups = new Map<string, CalendarEntry[]>();
  for (const e of entries) {
    if (!e.checkInId) continue;
    groups.set(e.checkInId, [...(groups.get(e.checkInId) ?? []), e]);
  }
  const out: CheckIn[] = [];
  for (const [id, group] of groups) {
    const mood = group.find((e) => e.category === "mood");
    const pain = group.find((e) => e.category === "pain");
    const first = [...group].sort((a, b) => a.loggedAt.localeCompare(b.loggedAt))[0];
    const d = mood?.details ?? {};
    out.push(
      normalizeCheckIn({
        id,
        createdAt: first.loggedAt,
        updatedAt: group.map((e) => e.updatedAt).sort().pop(),
        overall: d.overall ?? null,
        feelings: d.feelings ?? [],
        bodyParts: d.bodyParts ?? [],
        pain: pain?.details.spots ?? [],
        since: d.since ?? pain?.details.since ?? null,
        note: mood?.note ?? pain?.note ?? "",
        hasVoiceNote: !!d.hasVoiceNote,
        ownWords: d.ownWords,
        entryIds: { mood: mood?.id, pain: pain?.id },
        private: group.some((e) => e.private),
      })
    );
  }
  return sortCheckIns(out);
}

// ---- Check-ins saved before they moved into the calendar ----

const OLD_LIST_KEY = "voiced:my-voice-check-ins";
// What My Voice kept before there was a list: one check-in, and one body map.
const OLD_CHECKIN_KEY = "verity-my-voice-checkin";
const OLD_PAIN_KEY = "verity-my-voice-pain";

function readOldLocal(): CheckIn[] {
  try {
    const raw = localStorage.getItem(OLD_LIST_KEY);
    const list = raw ? (JSON.parse(raw) as CheckIn[]).map(normalizeCheckIn) : [];
    const oldCheckIn = localStorage.getItem(OLD_CHECKIN_KEY);
    const oldPain = localStorage.getItem(OLD_PAIN_KEY);
    if (oldCheckIn || oldPain) {
      const checkIn = oldCheckIn ? normalizeCheckIn(JSON.parse(oldCheckIn) as CheckIn) : null;
      const pain = oldPain ? (JSON.parse(oldPain) as PainReport) : null;
      // One check-in if they were made in the same sitting; two if not.
      const sameSitting =
        checkIn &&
        pain &&
        Math.abs(Date.parse(checkIn.createdAt) - Date.parse(pain.createdAt)) < 60 * 60 * 1000;
      if (checkIn && pain?.spots.length && !checkIn.pain?.length && sameSitting) {
        list.push({ ...checkIn, pain: pain.spots });
      } else {
        if (checkIn) list.push(checkIn);
        if (pain?.spots.length) list.push(normalizeCheckIn({ createdAt: pain.createdAt, pain: pain.spots }));
      }
    }
    return list;
  } catch {
    return [];
  }
}

function clearOldLocal() {
  try {
    [OLD_LIST_KEY, OLD_CHECKIN_KEY, OLD_PAIN_KEY].forEach((k) => localStorage.removeItem(k));
  } catch {
    // ignore
  }
}

/** Move old check-ins (this device, and the my_voice_check_ins table if it
 *  was set up) into the calendar. Each source is only cleared once its
 *  check-ins are safely saved. */
async function moveOldCheckIns(userId: string | null): Promise<void> {
  const local = readOldLocal();
  if (local.length) {
    await saveEntries(userId, local.flatMap(checkInToEntries));
    clearOldLocal();
  }
  if (!userId || !authEnabled) return;
  const { data, error } = await supabase.from("my_voice_check_ins").select("id, data");
  // No table (never set up) or nothing in it: nothing to move.
  if (error || !data?.length) return;
  const rows = data as { id: string; data: CheckIn }[];
  const where = await saveEntries(
    userId,
    rows.flatMap((r) => checkInToEntries(normalizeCheckIn({ ...r.data, id: r.id })))
  );
  if (where === "account") {
    await supabase.from("my_voice_check_ins").delete().in("id", rows.map((r) => r.id));
  }
}

// ---- What My Voice calls ----

export async function listCheckIns(
  userId: string | null,
  /** Whose: the signed-in person's own, or someone they look after. */
  ownerId: string | null = userId
): Promise<{ checkIns: CheckIn[]; store: CheckInStore; accountMissing: boolean }> {
  if (userId && ownerId && ownerId !== userId) {
    return { checkIns: entriesToCheckIns(await listEntriesOf(ownerId)), store: "account", accountMissing: false };
  }
  await moveOldCheckIns(userId);
  const { entries, store, accountMissing } = await listEntries(userId);
  return { checkIns: entriesToCheckIns(entries), store, accountMissing };
}

/** Save a new check-in, or changes to one. Returns it with the ids of its
 *  calendar entries, and where it went. A part emptied out on an edit (say,
 *  the body map cleared) has its entry deleted. */
export async function saveCheckInTo(
  userId: string | null,
  checkIn: CheckIn,
  /** A grown-up saving it on the profile of someone they look after: it goes
   *  in that person's calendar, marked as the grown-up's. */
  forPerson?: string | null
): Promise<{ checkIn: CheckIn; where: CheckInStore }> {
  const own = checkInToEntries(checkIn);
  const entries =
    forPerson && userId && forPerson !== userId
      ? own.map((e) => ({ ...e, userId: forPerson, loggedBy: userId, reportedBy: "caregiver" as const, private: false }))
      : own;
  const mood = entries.find((e) => e.category === "mood");
  const pain = entries.find((e) => e.category === "pain");
  const stale = [checkIn.entryIds?.mood, checkIn.entryIds?.pain].filter(
    (id): id is string => !!id && !entries.some((e) => e.id === id)
  );
  const where = await saveEntries(userId, entries);
  await deleteEntries(userId, stale);
  return { checkIn: { ...checkIn, entryIds: { mood: mood?.id, pain: pain?.id } }, where };
}

export async function deleteCheckInFrom(userId: string | null, checkIn: CheckIn): Promise<void> {
  await deleteEntries(
    userId,
    [checkIn.entryIds?.mood, checkIn.entryIds?.pain].filter((id): id is string => !!id)
  );
}
