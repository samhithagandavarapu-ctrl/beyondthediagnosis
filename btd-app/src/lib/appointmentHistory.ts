import type { AppointmentForm } from "./appointmentPdf";
import type { CheckIn } from "./myVoice";
import { timelineIsEmpty } from "./timeline";

// Appointment Prep keeps two things in this browser, and nowhere else:
//
//  - the draft: whatever is in the form right now, saved as you type, so
//    leaving the page (or closing the tab) doesn't lose it;
//  - the history: a copy of each summary you generated, newest first, so a
//    past visit can be looked at, printed again, or used as the starting point
//    for the next one.
//
// Neither is uploaded. Health details stay on the device they were typed on.

export type HistoryEntry = {
  id: string;
  /** When the summary was generated. */
  savedAt: string;
  form: AppointmentForm;
  /** The My Voice check-in that was put on this summary, if one was. */
  myVoice: CheckIn | null;
};

const DRAFT_KEY = "voiced:appointment-draft";
const HISTORY_KEY = "voiced:appointment-history";
// Enough to cover a long run of visits without letting storage grow forever.
const HISTORY_LIMIT = 30;

export function loadDraft(): AppointmentForm | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as AppointmentForm) : null;
  } catch {
    return null;
  }
}

export function saveDraft(form: AppointmentForm) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
  } catch {
    // ignore — full or blocked storage just means the draft isn't kept
  }
}

export function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    // ignore
  }
}

export function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as HistoryEntry[]) : [];
  } catch {
    return [];
  }
}

function writeHistory(entries: HistoryEntry[]) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(entries));
  } catch {
    // ignore
  }
}

/** Add a generated summary to the top of the history. Generating the same
 *  form twice in a row (back to edit, nothing changed, generate again) updates
 *  the date on the existing entry instead of adding a duplicate. Returns the
 *  new list. */
export function addToHistory(form: AppointmentForm, myVoice: CheckIn | null): HistoryEntry[] {
  const entries = loadHistory();
  const now = new Date().toISOString();
  const latest = entries[0];
  const same =
    latest &&
    JSON.stringify(latest.form) === JSON.stringify(form) &&
    JSON.stringify(latest.myVoice ?? null) === JSON.stringify(myVoice);
  let next: HistoryEntry[];
  if (same) {
    next = [{ ...latest, savedAt: now }, ...entries.slice(1)];
  } else {
    next = [{ id: crypto.randomUUID(), savedAt: now, form, myVoice }, ...entries].slice(
      0,
      HISTORY_LIMIT
    );
  }
  writeHistory(next);
  return next;
}

export function removeFromHistory(id: string): HistoryEntry[] {
  const next = loadHistory().filter((e) => e.id !== id);
  writeHistory(next);
  return next;
}

export function clearHistory() {
  try {
    localStorage.removeItem(HISTORY_KEY);
  } catch {
    // ignore
  }
}

/** True when nothing has been typed into the form at all. */
export function formIsEmpty(form: AppointmentForm) {
  return (
    !form.patientName.trim() &&
    !form.reasonForVisit.trim() &&
    !form.accommodations.trim() &&
    form.symptoms.every((s) => !s.description.trim() && !s.onset.trim()) &&
    form.medications.every((m) => !m.name.trim() && !m.dose.trim() && !m.frequency.trim()) &&
    form.ruledOut.every((r) => !r.description.trim() && !r.when.trim()) &&
    form.questions.every((q) => !q.text.trim()) &&
    timelineIsEmpty(form.timeline)
  );
}

/** A one-line label for a history entry: who it was for and why. */
export function historyTitle(form: AppointmentForm) {
  const who = form.patientName.trim();
  const why = form.reasonForVisit.trim().split(/\n/)[0];
  if (who && why) return `${who} — ${why}`;
  return who || why || "Visit summary";
}
