import { useMemo, useState } from "react";
import Icon from "../icons/Icon";
import {
  CATEGORIES,
  CalendarEntry,
  CategoryId,
  CustomSymptom,
  aboutLines,
  detailLines,
  entryIcon,
  entryTitle,
  longDate,
  todayKey,
} from "../../lib/calendar";
import { importable, loggedMedicines, rangePicks } from "../../lib/calendarImport";
import { feeling, painSpotSentence } from "../../lib/myVoice";

// "Bring in from my calendar": pick a date range and a kind of entry, then
// tick exactly which entries come over. Nothing is ticked to start except
// what's already in the visit tray (ticked on the calendar for this visit).

export default function CalendarImport({
  entries,
  customs,
  lastVisit,
  alreadyIn,
  onImport,
  onClose,
}: {
  entries: CalendarEntry[];
  customs: CustomSymptom[];
  /** When the last summary was made, for "Since my last visit". */
  lastVisit: string | null;
  /** Entries already brought into this draft; they aren't offered again. */
  alreadyIn: Set<string>;
  onImport: (picked: CalendarEntry[], from: string, to: string, medicines: string[]) => void;
  onClose: () => void;
}) {
  const picks = rangePicks(lastVisit);
  const [from, setFrom] = useState(picks[0].from);
  const [to, setTo] = useState(todayKey());
  const [only, setOnly] = useState<CategoryId | "all">("all");
  const [ticked, setTicked] = useState<Set<string>>(
    () => new Set(entries.filter((e) => e.addToVisit && !alreadyIn.has(e.id)).map((e) => e.id))
  );
  const [medsStep, setMedsStep] = useState<{ picked: CalendarEntry[]; meds: string[] } | null>(null);
  const [keepMeds, setKeepMeds] = useState<Set<string>>(new Set());

  const tray = entries.filter((e) => e.addToVisit && !alreadyIn.has(e.id) && !e.checkInId);
  const shown = useMemo(
    () => importable(entries, from, to, only).filter((e) => !alreadyIn.has(e.id)),
    [entries, from, to, only, alreadyIn]
  );
  const kinds = CATEGORIES.filter((c) => importable(entries, from, to, c.id).length > 0);
  const picked = entries.filter((e) => ticked.has(e.id));

  function toggle(id: string) {
    setTicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function bringIn() {
    // The range shown on the PDF covers everything picked, tray included.
    const days = picked.map((e) => e.entryDate).sort();
    const start = days[0] < from ? days[0] : from;
    const end = days[days.length - 1] > to ? days[days.length - 1] : to;
    const meds = loggedMedicines(picked);
    if (meds.length) {
      setKeepMeds(new Set(meds));
      setMedsStep({ picked, meds });
      return;
    }
    onImport(picked, start, end, []);
  }

  if (medsStep) {
    const days = medsStep.picked.map((e) => e.entryDate).sort();
    return (
      <div className="rounded-card border-2 border-sky bg-sky-tint p-5">
        <p className="text-17 font-extrabold text-navy">Medicines from your calendar</p>
        <p className="mt-1 text-sm text-body">
          These were written on the entries you picked. Tick the ones to add to Current medications.
        </p>
        <ul className="mt-3 grid gap-2">
          {medsStep.meds.map((m) => (
            <li key={m}>
              <label className="flex min-h-[48px] items-center gap-3 rounded-tile border border-navy/12 bg-white px-4">
                <input
                  type="checkbox"
                  className="h-5 w-5"
                  checked={keepMeds.has(m)}
                  onChange={() =>
                    setKeepMeds((prev) => {
                      const next = new Set(prev);
                      if (next.has(m)) next.delete(m);
                      else next.add(m);
                      return next;
                    })
                  }
                />
                <span className="text-15 font-semibold text-navy">{m}</span>
              </label>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() =>
              onImport(medsStep.picked, days[0] < from ? days[0] : from, days[days.length - 1] > to ? days[days.length - 1] : to, [...keepMeds])
            }
            className="btd-btn-coral min-h-[48px] px-6 py-3 text-sm"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-card border-2 border-sky bg-sky-tint p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-17 font-extrabold text-navy">Bring in from my calendar</p>
          <p className="mt-1 text-sm text-body">
            Pick a time, then tick exactly what to bring in. Things of the same kind become one
            symptom, and nothing you've typed is changed.
          </p>
        </div>
        <button type="button" onClick={onClose} className="text-sm font-semibold text-link hover:underline">
          Close
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="When">
        {picks.map((p) => {
          const on = from === p.from && to === p.to;
          return (
            <button
              key={p.id}
              type="button"
              aria-pressed={on}
              onClick={() => {
                setFrom(p.from);
                setTo(p.to);
              }}
              className={`min-h-[40px] rounded-full border px-4 py-2 text-sm ${
                on ? "border-navy bg-navy font-bold text-mist" : "border-navy/15 bg-white font-medium text-navy hover:border-navy/40"
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-navy">
        <label className="flex items-center gap-2">
          From
          <input type="date" className="btd-input w-auto py-2" value={from} max={to} onChange={(e) => e.target.value && setFrom(e.target.value)} />
        </label>
        <label className="flex items-center gap-2">
          To
          <input type="date" className="btd-input w-auto py-2" value={to} min={from} max={todayKey()} onChange={(e) => e.target.value && setTo(e.target.value)} />
        </label>
      </div>

      {kinds.length > 1 && (
        <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="What kind">
          {[{ id: "all" as const, short: "Everything" }, ...kinds].map((k) => (
            <button
              key={k.id}
              type="button"
              aria-pressed={only === k.id}
              onClick={() => setOnly(k.id)}
              className={`min-h-[36px] rounded-full border px-3 py-1.5 text-13 ${
                only === k.id ? "border-navy bg-sky font-bold text-navy" : "border-navy/15 bg-white text-navy"
              }`}
            >
              {k.short}
            </button>
          ))}
        </div>
      )}

      {tray.length > 0 && (
        <EntryList
          title={`In your visit tray (${tray.length})`}
          list={tray}
          ticked={ticked}
          onToggle={toggle}
          customs={customs}
        />
      )}
      <EntryList
        title={`${longDate(from)} to ${longDate(to)}`}
        list={shown.filter((e) => !e.addToVisit)}
        ticked={ticked}
        onToggle={toggle}
        customs={customs}
        empty="Nothing logged in this time."
      />

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={picked.length === 0}
          onClick={bringIn}
          className="btd-btn-coral min-h-[48px] gap-2 px-6 py-3 text-sm disabled:opacity-40"
        >
          <Icon name="calendar" size={18} />
          Bring in {picked.length || ""} {picked.length === 1 ? "thing" : "things"}
        </button>
        {shown.length > 0 && (
          <button
            type="button"
            onClick={() => setTicked((prev) => new Set([...prev, ...shown.map((e) => e.id)]))}
            className="text-sm font-semibold text-link hover:underline"
          >
            Tick everything shown
          </button>
        )}
      </div>
    </div>
  );
}

function EntryList({
  title,
  list,
  ticked,
  onToggle,
  customs,
  empty,
}: {
  title: string;
  list: CalendarEntry[];
  ticked: Set<string>;
  onToggle: (id: string) => void;
  customs: CustomSymptom[];
  empty?: string;
}) {
  return (
    <div className="mt-4">
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-slate">{title}</p>
      {list.length === 0 ? (
        empty && <p className="text-sm text-slate">{empty}</p>
      ) : (
        <ul className="grid gap-2">
          {list.map((e) => (
            <li key={e.id}>
              <label className="flex cursor-pointer items-start gap-3 rounded-tile border border-navy/10 bg-white p-3">
                <input type="checkbox" className="mt-1 h-4 w-4 shrink-0" checked={ticked.has(e.id)} onChange={() => onToggle(e.id)} />
                <Icon name={entryIcon(e, customs)} size={22} className="mt-0.5 text-navy" />
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-navy">
                    {entryTitle(e)} · {longDate(e.entryDate)}
                  </span>
                  <span className="block text-13 text-body">
                    {[...detailLines(e, (id) => feeling(id).short, painSpotSentence), ...aboutLines(e)].join(" · ")}
                  </span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

