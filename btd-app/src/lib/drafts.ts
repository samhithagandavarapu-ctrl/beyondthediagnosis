import { authEnabled, supabase } from "./supabaseClient";
import type { AppointmentForm, Medication, Question, RuledOutItem, Symptom } from "./appointmentPdf";
import type { CheckIn } from "./myVoice";
import { emptyTimeline } from "./timeline";
import { loadDraft as loadOldDraft, clearDraft as clearOldDraft } from "./appointmentHistory";

// Appointment Prep drafts: as many as you like, each with a name, each
// holding the form and the My Voice sentence that goes with it.
//
// Signed in, they're kept in your account (the appointment_drafts table — see
// supabase/appointment-drafts.sql) so they follow you to any device. Signed
// out, or before that table exists, they're kept in this browser. Signing in
// moves any drafts made on this device into the account, so nothing made
// before signing in is left behind.

export type Draft = {
  id: string;
  /** What the person called it. Empty means "use the patient's name". */
  name: string;
  form: AppointmentForm;
  myVoice: CheckIn | null;
  updatedAt: string;
};

export type DraftStore = "account" | "device";

const LOCAL_KEY = "voiced:appointment-drafts";
const ACTIVE_KEY = "voiced:active-draft";

export const newId = () => crypto.randomUUID();

export const emptySymptom = (): Symptom => ({
  id: newId(),
  description: "",
  onset: "",
  baselineOrNew: "new",
});

// Medications and ruled-out items are one entry per thing, like symptoms —
// a single free-text box turns into an unreadable wall on the printed page,
// and there's nothing to line up dose against frequency.
export const emptyMedication = (): Medication => ({ id: newId(), name: "", dose: "", frequency: "" });
export const emptyRuledOut = (): RuledOutItem => ({ id: newId(), description: "", when: "" });
export const emptyQuestion = (): Question => ({ id: newId(), text: "" });

export const emptyForm = (): AppointmentForm => ({
  patientName: "",
  reasonForVisit: "",
  symptoms: [emptySymptom()],
  medications: [emptyMedication()],
  ruledOut: [emptyRuledOut()],
  accommodations: "",
  questions: [emptyQuestion()],
  timeline: emptyTimeline(),
});

export function newDraft(patch: Partial<Draft> = {}): Draft {
  return {
    id: newId(),
    name: "",
    form: emptyForm(),
    myVoice: null,
    updatedAt: new Date().toISOString(),
    ...patch,
  };
}

/** The name shown for a draft in the list. */
export function draftLabel(draft: Draft): string {
  return draft.name.trim() || draft.form.patientName.trim() || "Untitled draft";
}

// ---- This device ----

function readLocal(): Draft[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    const drafts = raw ? (JSON.parse(raw) as Draft[]) : [];
    // The single draft the page used to keep becomes the first named one.
    const old = loadOldDraft();
    if (old) {
      const checkIn = localStorage.getItem("verity-my-voice-checkin");
      drafts.unshift(newDraft({ form: old, myVoice: checkIn ? (JSON.parse(checkIn) as CheckIn) : null }));
      writeLocal(drafts);
      clearOldDraft();
    }
    return drafts;
  } catch {
    return [];
  }
}

function writeLocal(drafts: Draft[]) {
  try {
    if (drafts.length) localStorage.setItem(LOCAL_KEY, JSON.stringify(drafts));
    else localStorage.removeItem(LOCAL_KEY);
  } catch {
    // Full or blocked storage just means drafts aren't kept on this device.
  }
}

export function getActiveDraftId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_KEY);
  } catch {
    return null;
  }
}

export function setActiveDraftId(id: string) {
  try {
    localStorage.setItem(ACTIVE_KEY, id);
  } catch {
    // ignore
  }
}

// ---- The account ----

type Row = {
  id: string;
  name: string;
  form: AppointmentForm;
  my_voice: CheckIn | null;
  updated_at: string;
};

const fromRow = (r: Row): Draft => ({
  id: r.id,
  name: r.name,
  form: r.form,
  myVoice: r.my_voice,
  updatedAt: r.updated_at,
});

const toRow = (d: Draft) => ({
  id: d.id,
  name: d.name,
  form: d.form,
  my_voice: d.myVoice,
  updated_at: d.updatedAt,
});

/** Every draft for whoever is here, newest first, and where they live.
 *  `accountMissing` is true when someone is signed in but the account can't
 *  hold drafts yet (the SQL hasn't been run), so they're on this device. */
export async function listDrafts(
  userId: string | null
): Promise<{ drafts: Draft[]; store: DraftStore; accountMissing: boolean }> {
  const local = readLocal();
  if (!userId || !authEnabled) {
    return { drafts: sortDrafts(local), store: "device", accountMissing: false };
  }

  // Bring anything made on this device into the account first.
  if (local.length) {
    const { error } = await supabase
      .from("appointment_drafts")
      .upsert(local.map(toRow), { onConflict: "id" });
    if (!error) writeLocal([]);
  }

  const { data, error } = await supabase
    .from("appointment_drafts")
    .select("id, name, form, my_voice, updated_at")
    .order("updated_at", { ascending: false });
  if (error) {
    console.error("Couldn't load drafts from the account:", error.message);
    return { drafts: sortDrafts(readLocal()), store: "device", accountMissing: true };
  }
  return { drafts: (data as Row[]).map(fromRow), store: "account", accountMissing: false };
}

/** Save one draft where it lives. Returns where it actually went: if the
 *  account can't take it, it's kept on this device instead of lost. */
export async function saveDraft(userId: string | null, draft: Draft): Promise<DraftStore> {
  if (userId && authEnabled) {
    const { error } = await supabase
      .from("appointment_drafts")
      .upsert(toRow(draft), { onConflict: "id" });
    if (!error) return "account";
    console.error("Couldn't save draft to the account:", error.message);
  }
  const local = readLocal().filter((d) => d.id !== draft.id);
  writeLocal([draft, ...local]);
  return "device";
}

export async function deleteDraft(userId: string | null, id: string): Promise<void> {
  writeLocal(readLocal().filter((d) => d.id !== id));
  if (userId && authEnabled) {
    const { error } = await supabase.from("appointment_drafts").delete().eq("id", id);
    if (error) console.error("Couldn't delete draft from the account:", error.message);
  }
}

/** Put a finished My Voice sentence on the draft being worked on (or a new
 *  one), so it's waiting in Appointment Prep on any device. */
export async function attachCheckIn(userId: string | null, checkIn: CheckIn): Promise<void> {
  const { drafts } = await listDrafts(userId);
  const activeId = getActiveDraftId();
  const target = drafts.find((d) => d.id === activeId) ?? drafts[0] ?? newDraft();
  setActiveDraftId(target.id);
  await saveDraft(userId, { ...target, myVoice: checkIn, updatedAt: new Date().toISOString() });
}

function sortDrafts(drafts: Draft[]): Draft[] {
  return [...drafts].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
