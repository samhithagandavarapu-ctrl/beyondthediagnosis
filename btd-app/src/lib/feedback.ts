import { authEnabled, supabase } from "./supabaseClient";

// Feedback from families testing Voiced (the feedback table, see
// supabase/migrations/20261030_feedback.sql). Anyone sends it; only admins
// read it, at /admin/feedback.
//
// Nothing gets lost: an answer is kept in this browser until the database
// says it has it. If sending fails it waits there and is sent again the next
// time Voiced opens. Each answer carries its own id, so a resend never counts
// twice.

export const ROLES = [
  { id: "parent", label: "Parent" },
  { id: "caregiver", label: "Caregiver or family member" },
  { id: "self-advocate", label: "I have Down syndrome" },
  { id: "clinician", label: "Doctor, nurse, or therapist" },
  { id: "other", label: "Someone else" },
] as const;

export const FEATURES = [
  "Appointment Prep",
  "AI Advocate",
  "My Voice",
  "Symptom Timeline",
  "Practice My Visit",
  "Calendar",
  "Calm button",
  "Stories",
  "Resources",
] as const;

export type Feedback = {
  id: string;
  role: (typeof ROLES)[number]["id"] | null;
  tried: string[];
  ease: number | null;
  wouldBring: "yes" | "maybe" | "no" | null;
  wouldBringWhy: string;
  confusing: string;
  wish: string;
  useAgain: "not likely" | "maybe" | "definitely" | null;
  personLiked: "no" | "okay" | "yes" | null;
  personCouldTell: "no" | "a little" | "yes" | null;
  contactOk: boolean;
  contact: string;
};

export type FeedbackRow = Feedback & { createdAt: string; signedIn: boolean };

export const emptyFeedback = (): Feedback => ({
  id: crypto.randomUUID(),
  role: null,
  tried: [],
  ease: null,
  wouldBring: null,
  wouldBringWhy: "",
  confusing: "",
  wish: "",
  useAgain: null,
  personLiked: null,
  personCouldTell: null,
  contactOk: false,
  contact: "",
});

/** True once at least one question has an answer. */
export const hasAnswers = (f: Feedback) =>
  Boolean(
    f.role || f.tried.length || f.ease || f.wouldBring || f.wouldBringWhy.trim() || f.confusing.trim() ||
      f.wish.trim() || f.useAgain || f.personLiked || f.personCouldTell
  );

const DRAFT_KEY = "voiced:feedback-draft";
const UNSENT_KEY = "voiced:feedback-unsent";

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write(key: string, value: unknown) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Without storage the answers only last until the page closes.
  }
}

/** What was being typed, so closing the tab doesn't lose it. */
export const loadDraft = (): Feedback | null => read<Feedback | null>(DRAFT_KEY, null);
export const saveDraft = (f: Feedback | null) => write(DRAFT_KEY, f);

const toRow = (f: Feedback) => ({
  id: f.id,
  role: f.role,
  tried: f.tried,
  ease: f.ease,
  would_bring: f.wouldBring,
  would_bring_why: f.wouldBringWhy.trim() || null,
  confusing: f.confusing.trim() || null,
  wish: f.wish.trim() || null,
  use_again: f.useAgain,
  person_liked: f.personLiked,
  person_could_tell: f.personCouldTell,
  contact_ok: f.contactOk,
  contact: f.contactOk ? f.contact.trim() || null : null,
});

async function insert(f: Feedback): Promise<string | null> {
  if (!authEnabled) return "offline";
  const { error } = await supabase.from("feedback").insert(toRow(f));
  // Already there from an earlier try: that's a success.
  if (!error || error.code === "23505") return null;
  return error.message;
}

/** Sends one answer. If it can't go now, it's kept to send later, and the
 *  result says so: "sent" or "saved" (waiting in this browser). */
export async function sendFeedback(f: Feedback): Promise<"sent" | "saved"> {
  const error = await insert(f);
  if (!error) return "sent";
  const unsent = read<Feedback[]>(UNSENT_KEY, []).filter((u) => u.id !== f.id);
  write(UNSENT_KEY, [...unsent, f]);
  return "saved";
}

/** Tries again to send anything that couldn't go before. Run when Voiced opens. */
export async function sendWaitingFeedback() {
  const unsent = read<Feedback[]>(UNSENT_KEY, []);
  if (!unsent.length || !authEnabled) return;
  const still: Feedback[] = [];
  for (const f of unsent) if (await insert(f)) still.push(f);
  write(UNSENT_KEY, still.length ? still : null);
}

type Row = ReturnType<typeof toRow> & { created_at: string; user_id: string | null };

/** Every answer, newest first. Admins only (the database refuses anyone else). */
export async function listFeedback(): Promise<{ data: FeedbackRow[]; error: string | null }> {
  if (!authEnabled) return { data: [], error: "Accounts aren't connected on this site." };
  const all: Row[] = [];
  // Supabase hands back at most 1000 rows at a time: keep asking until done.
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("feedback")
      .select("*")
      .order("created_at", { ascending: false })
      .range(from, from + 999);
    if (error) {
      const missing = /feedback/.test(error.message) && /exist|schema cache/.test(error.message);
      return {
        data: [],
        error: missing ? "Feedback isn't set up yet. Run supabase/migrations/20261030_feedback.sql in Supabase first." : error.message,
      };
    }
    all.push(...((data ?? []) as Row[]));
    if (!data || data.length < 1000) break;
  }
  return {
    data: all.map((r) => ({
      id: r.id,
      createdAt: r.created_at,
      signedIn: Boolean(r.user_id),
      role: r.role as Feedback["role"],
      tried: r.tried ?? [],
      ease: r.ease,
      wouldBring: r.would_bring as Feedback["wouldBring"],
      wouldBringWhy: r.would_bring_why ?? "",
      confusing: r.confusing ?? "",
      wish: r.wish ?? "",
      useAgain: r.use_again as Feedback["useAgain"],
      personLiked: r.person_liked as Feedback["personLiked"],
      personCouldTell: r.person_could_tell as Feedback["personCouldTell"],
      contactOk: r.contact_ok,
      contact: r.contact ?? "",
    })),
    error: null,
  };
}

/** Deletes one answer for good. Admins only. */
export async function deleteFeedback(id: string): Promise<string | null> {
  const { data, error } = await supabase.from("feedback").delete().eq("id", id).select("id");
  if (error) return error.message;
  // The database quietly deletes nothing when deleting isn't allowed yet.
  if (!data?.length) return "Couldn't delete it. Run supabase/migrations/20261031_feedback_delete.sql in Supabase first.";
  return null;
}

export const roleLabel = (id: Feedback["role"]) => ROLES.find((r) => r.id === id)?.label ?? "";

const COLUMNS: [string, (r: FeedbackRow) => string | number | null][] = [
  ["Sent", (r) => r.createdAt],
  ["Who", (r) => roleLabel(r.role)],
  ["Signed in", (r) => (r.signedIn ? "yes" : "no")],
  ["Tried", (r) => r.tried.join("; ")],
  ["Easy to use (1-5)", (r) => r.ease],
  ["Would bring summary to a visit", (r) => r.wouldBring],
  ["Why / why not", (r) => r.wouldBringWhy],
  ["Confusing or felt wrong", (r) => r.confusing],
  ["Wish it did", (r) => r.wish],
  ["Use again", (r) => r.useAgain],
  ["Person liked it", (r) => r.personLiked],
  ["Person could tell their doctor", (r) => r.personCouldTell],
  ["OK to contact", (r) => (r.contactOk ? "yes" : "no")],
  ["Contact", (r) => r.contact],
];

/** A spreadsheet (CSV) of every answer, one row each. */
export function feedbackCsv(rows: FeedbackRow[]): string {
  const cell = (v: string | number | null) => {
    let s = v == null ? "" : String(v);
    // A typed answer starting with = + - @ would run as a formula in Excel.
    if (/^[=+\-@]/.test(s)) s = `'${s}`;
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [COLUMNS.map(([h]) => cell(h)).join(","), ...rows.map((r) => COLUMNS.map(([, get]) => cell(get(r))).join(","))];
  // The byte-order mark makes Excel read emoji and accents correctly.
  return "﻿" + lines.join("\r\n");
}
