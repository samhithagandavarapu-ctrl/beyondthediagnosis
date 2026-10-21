import { useState } from "react";
import Icon from "../icons/Icon";
import SpeakButton from "../myvoice/SpeakButton";
import { BagChecklist, LearnMore, MealtimeReminder, TellADoctor, bagPacked } from "./PeriodHelp";
import { useMyVoice } from "../../context/MyVoiceContext";
import { CalendarEntry, CalendarStore, fromDateKey, isPeriodDay, newEntry, todayKey } from "../../lib/calendar";
import { cycles, daysBetween, daysSinceLastPeriod, predictNext } from "../../lib/cycles";

// My period, on its own screen: three big buttons for today, and around
// them the bag, the picture stories and when to tell a doctor.

type SaveResult = CalendarStore | "practice";
type Choice = "started" | "going" | "stopped";

const shortDay = (key: string) => fromDateKey(key).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });

export default function PeriodScreen({
  entries,
  practice,
  asCaregiverFor,
  mine,
  onSave,
  onMore,
  onBack,
}: {
  entries: CalendarEntry[];
  practice: boolean;
  /** A linked grown-up logging in this child's calendar (their name). */
  asCaregiverFor?: string;
  /** Whether this person can change an entry (a grown-up only their own). */
  mine: (e: CalendarEntry) => boolean;
  onSave: (entry: CalendarEntry) => Promise<SaveResult>;
  /** Open today's period entry in the full form: pad, leaks, blobs. */
  onMore: (entry: CalendarEntry) => void;
  onBack: () => void;
}) {
  const { say, earnSticker } = useMyVoice();
  const today = todayKey();
  const [justSaved, setJustSaved] = useState<CalendarEntry | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [gotSticker, setGotSticker] = useState(false);

  const todays = entries.find((e) => e.entryDate === today && e.category === "period" && !e.details.spotting && mine(e));
  const picked: Choice | null = todays ? (todays.details.ended ? "stopped" : todays.details.firstDay ? "started" : "going") : null;

  // Is a period going on? The last one started recently, its last logged day
  // is today or yesterday, and nobody said it stopped since.
  const last = cycles(entries).slice(-1)[0];
  const lastDay = [...entries].filter(isPeriodDay).map((e) => e.entryDate).sort().slice(-1)[0];
  const stoppedSince = last && entries.some((e) => e.category === "period" && e.details.ended && e.entryDate >= last.start);
  const going = !!last && !!lastDay && daysBetween(lastDay, today) <= 1 && !stoppedSince;
  const dayN = going && last ? daysBetween(last.start, today) + 1 : null;
  const since = daysSinceLastPeriod(entries);
  const next = predictNext(entries);
  const bag = bagPacked();

  async function choose(c: Choice) {
    const base = todays ?? newEntry({ entryDate: today, category: "period", reportedBy: asCaregiverFor ? "caregiver" : "self" });
    const now = new Date().toISOString();
    const entry: CalendarEntry = {
      ...base,
      category: "period",
      details: { ...base.details, firstDay: c === "started", ended: c === "stopped" || undefined, spotting: undefined },
      loggedAt: todays ? base.loggedAt : now,
      updatedAt: now,
    };
    setJustSaved(entry);
    say(c === "started" ? "It started today" : c === "going" ? "Still going" : "It stopped");
    await onSave(entry);
    if (!practice && !asCaregiverFor && !todays && !gotSticker) {
      earnSticker("logged-my-day");
      setGotSticker(true);
    }
  }

  const choices: { id: Choice; label: string }[] = [
    { id: "started", label: "It started today" },
    { id: "going", label: "Still going" },
    { id: "stopped", label: "It stopped" },
  ];

  const rows = [
    { id: "bag", label: "My period bag", aside: `${bag.packed} of ${bag.of} packed`, body: <BagChecklist /> },
    { id: "stories", label: "Picture stories", aside: "", body: <LearnMore /> },
    { id: "doctor", label: "When to tell a doctor", aside: "", body: <TellADoctor /> },
  ];

  return (
    <div className="mx-auto grid w-full max-w-xl gap-5">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white text-navy shadow-sm hover:bg-sky-tint"
        >
          <Icon name="chevron-right" size={22} className="rotate-180" />
        </button>
        <h2 className="font-display text-28 font-extrabold text-navy">{asCaregiverFor ? `${asCaregiverFor}'s period` : "My period"}</h2>
      </div>

      <div className="flex items-center gap-4 rounded-card bg-[#FFE1DA] p-4">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white text-[#B2442E]">
          <Icon name="drop" size={26} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-21 font-extrabold text-navy">
            {dayN ? `Day ${dayN} of ${asCaregiverFor ? "the" : "my"} period` : "No period right now"}
          </span>
          <span className="block text-13 text-body">
            {dayN && last
              ? `Started ${shortDay(last.start)}`
              : next
                ? `The next one might start around ${fromDateKey(next.start).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`
                : since !== null
                  ? `${since} days since the last one started`
                  : "Tap below when it starts."}
          </span>
        </span>
        <SpeakButton text={dayN ? `Day ${dayN} of my period` : "No period right now"} />
      </div>

      <div>
        <p className="mb-2 text-15 font-bold text-navy">Today, tap one</p>
        <div className="grid gap-3" role="radiogroup" aria-label="My period today">
          {choices.map((c) => {
            const on = (justSaved ? (justSaved.details.ended ? "stopped" : justSaved.details.firstDay ? "started" : "going") : picked) === c.id;
            return (
              <button
                key={c.id}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => choose(c.id)}
                className={`min-h-[64px] rounded-card border-2 px-5 text-21 font-extrabold text-navy ${
                  on ? "border-[#E99580] bg-coral" : "border-navy/15 bg-white hover:border-coral"
                }`}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      </div>

      {justSaved && (
        <div className="grid gap-3 rounded-card border-2 border-navy/10 bg-white p-4" role="status">
          <p className="flex items-center gap-2 text-17 font-extrabold text-navy">
            <Icon name={gotSticker ? "star" : "check"} size={22} />
            {practice ? "Saved, for practice." : gotSticker ? "Saved! You got a sticker." : "Saved!"}
          </p>
          {!justSaved.details.ended && (
            <button
              type="button"
              onClick={() => onMore(justSaved)}
              className="flex min-h-[56px] items-center justify-between gap-3 rounded-card border-2 border-dashed border-navy/25 px-4 text-left hover:border-sky"
            >
              <span>
                <span className="block text-15 font-extrabold text-navy">Add more (you don't have to)</span>
                <span className="block text-13 text-body">My pad, leaks, blobs, a note</span>
              </span>
              <Icon name="plus" size={22} className="text-navy" />
            </button>
          )}
        </div>
      )}

      {(going || picked === "started" || picked === "going") && picked !== "stopped" && <MealtimeReminder />}

      <ul className="overflow-hidden rounded-card bg-white">
        {rows.map((r, i) => (
          <li key={r.id} className={i ? "border-t border-navy/10" : ""}>
            <button
              type="button"
              aria-expanded={open === r.id}
              onClick={() => setOpen(open === r.id ? null : r.id)}
              className="flex min-h-[60px] w-full items-center gap-3 px-5 text-left"
            >
              <span className="flex-1 text-17 font-bold text-navy">{r.label}</span>
              {r.aside && <span className="text-13 text-body">{r.aside}</span>}
              <Icon name="chevron-right" size={20} className={`text-navy transition-transform ${open === r.id ? "rotate-90" : ""}`} />
            </button>
            {open === r.id && <div className="px-3 pb-3">{r.body}</div>}
          </li>
        ))}
      </ul>

      <p className="rounded-card bg-butter/50 px-4 py-3 text-15 font-bold text-navy">
        If you faint, or the bleeding is very fast, call 911 now.
      </p>
    </div>
  );
}
