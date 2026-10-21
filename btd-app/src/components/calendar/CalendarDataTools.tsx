import { useState } from "react";
import Icon from "../icons/Icon";
import { useAuth } from "../../context/AuthContext";
import { useMyVoice } from "../../context/MyVoiceContext";
import {
  aboutLines,
  calendarCsv,
  clearCalendarDeviceSettings,
  deleteAllEntries,
  deleteCustomSymptoms,
  detailLines,
  listEntries,
} from "../../lib/calendar";
import { feeling, painSpotSentence } from "../../lib/myVoice";
import { buildCalendarPdf } from "../../lib/appointmentPdf";
import { calendarPageText } from "../../lib/calendarImport";
import { cycles } from "../../lib/cycles";

// The family owns this data: download all of it, or delete the period part
// or everything. Each delete needs the word DELETE typed first.

type Pending = "period" | "all" | null;

export default function CalendarDataTools({ onChanged }: { onChanged?: () => void }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const { reloadCheckIns } = useMyVoice();
  const [pending, setPending] = useState<Pending>(null);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [preparing, setPreparing] = useState(false);

  /** The whole calendar as a PDF, in the same style as the visit summary. */
  async function downloadPdf() {
    setPreparing(true);
    setMessage(null);
    try {
      const { entries } = await listEntries(userId);
      if (!entries.length) {
        setMessage("There's nothing in your calendar yet.");
        return;
      }
      const days = entries.map((e) => e.entryDate).sort();
      const page = calendarPageText(
        entries,
        days[0],
        days[days.length - 1],
        (e) => [...detailLines(e, (id) => feeling(id).short, painSpotSentence), ...aboutLines(e, true)],
        cycles(entries)
      );
      const doc = await buildCalendarPdf(page);
      doc.save(`my-voiced-calendar-${new Date().toISOString().slice(0, 10)}.pdf`);
      setMessage(`Downloaded ${entries.length} ${entries.length === 1 ? "entry" : "entries"}.`);
    } catch (err) {
      console.error(err);
      setMessage("Couldn't build the PDF. You can download a spreadsheet (CSV) instead.");
    } finally {
      setPreparing(false);
    }
  }

  async function download() {
    const { entries } = await listEntries(userId);
    const csv = calendarCsv(entries, (e) => detailLines(e, (id) => feeling(id).short, painSpotSentence).concat(aboutLines(e).filter((l) => l.startsWith("Started"))));
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `my-voiced-calendar-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage(`Downloaded ${entries.length} ${entries.length === 1 ? "entry" : "entries"}.`);
  }

  async function confirmDelete() {
    if (typed.trim().toUpperCase() !== "DELETE" || !pending) return;
    setBusy(true);
    const periodOnly = pending === "period";
    const ok = await deleteAllEntries(userId, periodOnly);
    if (!periodOnly) await deleteCustomSymptoms(userId);
    clearCalendarDeviceSettings(periodOnly);
    reloadCheckIns();
    onChanged?.();
    setBusy(false);
    setPending(null);
    setTyped("");
    setMessage(
      ok
        ? periodOnly
          ? "All your period data is deleted."
          : "Your whole calendar is deleted, including My Voice check-ins."
        : "Something went wrong deleting from your account. Please try again."
    );
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={downloadPdf} disabled={preparing} className="btd-btn-sky min-h-[48px] gap-2 px-5 py-3 text-sm disabled:opacity-60">
          <Icon name="save" size={18} />
          {preparing ? "Preparing…" : "Download my calendar (PDF)"}
        </button>
        <button type="button" onClick={download} className="btd-btn-outline min-h-[48px] px-5 py-3 text-sm">
          Spreadsheet (CSV)
        </button>
        <button
          type="button"
          onClick={() => {
            setPending("period");
            setTyped("");
            setMessage(null);
          }}
          className="btd-btn-outline min-h-[48px] px-5 py-3 text-sm"
        >
          Delete all my period data
        </button>
        <button
          type="button"
          onClick={() => {
            setPending("all");
            setTyped("");
            setMessage(null);
          }}
          className="btd-btn-outline min-h-[48px] px-5 py-3 text-sm"
        >
          Delete my whole calendar
        </button>
      </div>

      {pending && (
        <div role="alertdialog" aria-labelledby="cal-delete-title" className="rounded-card border-2 border-coral bg-coral/15 p-5">
          <p id="cal-delete-title" className="text-17 font-extrabold text-navy">
            {pending === "period" ? "Delete all your period data?" : "Delete your whole calendar?"}
          </p>
          <p className="mt-1 text-15 text-navy">
            {pending === "period"
              ? "Every period and spotting entry is deleted for good. Other entries stay."
              : "Every entry is deleted for good, including My Voice check-ins and your own symptom buttons."}{" "}
            This can't be undone.
          </p>
          <label className="mt-3 block text-15 font-semibold text-navy">
            Type DELETE to confirm
            <input
              className="btd-input mt-2 max-w-xs"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
            />
          </label>
          <div className="mt-3 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={typed.trim().toUpperCase() !== "DELETE" || busy}
              onClick={confirmDelete}
              className="btd-btn min-h-[48px] bg-navy px-5 py-3 text-sm text-mist disabled:opacity-40"
            >
              {busy ? "Deleting…" : "Delete for good"}
            </button>
            <button type="button" onClick={() => setPending(null)} className="min-h-[48px] px-3 text-sm font-semibold text-link hover:underline">
              Cancel
            </button>
          </div>
        </div>
      )}

      {message && (
        <p role="status" className="text-15 font-semibold text-navy">
          {message}
        </p>
      )}
    </div>
  );
}
