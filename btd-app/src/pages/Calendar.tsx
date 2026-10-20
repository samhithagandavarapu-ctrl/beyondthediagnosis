import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageHero from "../components/PageHero";
import Icon from "../components/icons/Icon";
import MonthGrid from "../components/calendar/MonthGrid";
import LogFlow from "../components/calendar/LogFlow";
import PracticeModeToggle from "../components/PracticeModeToggle";
import { useAuth } from "../context/AuthContext";
import { useMyVoice } from "../context/MyVoiceContext";
import { usePracticeMode } from "../context/PracticeModeContext";
import {
  CalendarEntry,
  CalendarStore,
  CustomSymptom,
  aboutLines,
  addCustomSymptom,
  deleteEntries,
  detailLines,
  entryIcon,
  entryTitle,
  listCustomSymptoms,
  listEntries,
  longDate,
  saveEntries,
  sortEntries,
  todayKey,
} from "../lib/calendar";
import { feeling, painSpotSentence } from "../lib/myVoice";

// The Symptom Calendar: log symptoms day by day, see them on a month, and
// look at any day. Nothing here is ever sent to the AI assistant.

type View =
  | { kind: "month" }
  | { kind: "day"; date: string }
  | { kind: "log"; date: string; entry?: CalendarEntry };

const PRIVACY_SEEN_KEY = "voiced:calendar-privacy-seen";

function upsert(list: CalendarEntry[], entry: CalendarEntry) {
  return sortEntries([entry, ...list.filter((e) => e.id !== entry.id)]);
}

export default function Calendar() {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id ?? null;
  const { practice } = usePracticeMode();
  const { readingLevel, reloadCheckIns } = useMyVoice();

  const [entries, setEntries] = useState<CalendarEntry[]>([]);
  // Practice mode logs into this instead, and it's gone when practice ends.
  const [practiceEntries, setPracticeEntries] = useState<CalendarEntry[]>([]);
  const [store, setStore] = useState<CalendarStore>("device");
  const [accountMissing, setAccountMissing] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [customs, setCustoms] = useState<CustomSymptom[]>([]);
  const [view, setView] = useState<View>({ kind: "month" });
  const [month, setMonth] = useState(todayKey());
  // Bumped to start a fresh log after "Log something else".
  const [logRun, setLogRun] = useState(0);
  const [privacySeen, setPrivacySeen] = useState(() => {
    try {
      return localStorage.getItem(PRIVACY_SEEN_KEY) === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    setLoaded(false);
    Promise.all([listEntries(userId), listCustomSymptoms(userId)]).then(([res, symptoms]) => {
      if (cancelled) return;
      setEntries(res.entries);
      setStore(res.store);
      setAccountMissing(res.accountMissing);
      setCustoms(symptoms);
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [userId, authLoading]);

  useEffect(() => {
    if (!practice) setPracticeEntries([]);
  }, [practice]);

  const shown = practice ? practiceEntries : entries;

  function show(next: View) {
    setView(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function save(entry: CalendarEntry): Promise<CalendarStore | "practice"> {
    if (practice) {
      setPracticeEntries((prev) => upsert(prev, entry));
      return "practice";
    }
    setEntries((prev) => upsert(prev, entry));
    const where = await saveEntries(userId, [entry]);
    if (entry.checkInId) reloadCheckIns();
    return where;
  }

  function remove(entry: CalendarEntry) {
    if (!window.confirm("Are you sure? This deletes it for good.")) return;
    if (practice) {
      setPracticeEntries((prev) => prev.filter((e) => e.id !== entry.id));
      return;
    }
    setEntries((prev) => prev.filter((e) => e.id !== entry.id));
    deleteEntries(userId, [entry.id]).then(() => {
      if (entry.checkInId) reloadCheckIns();
    });
  }

  function addSymptom(s: CustomSymptom) {
    setCustoms((prev) => [...prev, s]);
    addCustomSymptom(userId, s);
  }

  function dismissPrivacy() {
    setPrivacySeen(true);
    try {
      localStorage.setItem(PRIVACY_SEEN_KEY, "1");
    } catch {
      // ignore
    }
  }

  const logToday = () => show({ kind: "log", date: todayKey() });

  return (
    <div>
      <PageHero
        eyebrow="My Calendar"
        title="Log how things are, day by day"
        lede="Tap a day to see it, or log something for today. Periods, pain, feelings, sleep — anything. Pick what to bring to your next appointment."
      />

      <section className="btd-container grid gap-6 pt-8 pb-28 sm:pb-20">
        {!privacySeen && (
          <div className="flex flex-wrap items-center gap-4 rounded-card border-2 border-sky bg-sky-tint p-5">
            <Icon name="lock" size={28} className="text-navy" />
            <p className="min-w-0 flex-1 basis-[240px] text-15 font-semibold text-navy">
              Only you can see this. It isn't shown to anyone else on Voiced, not even Voiced's
              admins. You can delete it anytime.
            </p>
            <button type="button" onClick={dismissPrivacy} className="btd-btn-sky min-h-[44px] px-5 py-2 text-sm">
              Got it
            </button>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-13 text-muted">
            {practice
              ? "Practice mode is on. Nothing you log here is saved."
              : store === "account"
                ? "Saved to your account."
                : accountMissing
                  ? "Saved on this device for now. Your account can't hold the calendar yet."
                  : "Saved on this device only."}{" "}
            {!user && !practice && (
              <Link to="/login" className="font-semibold text-link hover:underline">
                Sign in to keep it safe on any device.
              </Link>
            )}
          </p>
          <PracticeModeToggle tone="light" />
        </div>

        {!loaded ? (
          <p className="text-body">Loading your calendar…</p>
        ) : view.kind === "log" ? (
          <LogFlow
            key={`${view.entry?.id ?? "new"}-${logRun}`}
            date={view.date}
            initial={view.entry}
            readingLevel={readingLevel}
            practice={practice}
            customSymptoms={customs}
            onAddCustomSymptom={addSymptom}
            onSave={save}
            onLogAnother={() => {
              setLogRun((n) => n + 1);
              show({ kind: "log", date: view.date });
            }}
            onDone={() => show({ kind: "day", date: view.date })}
          />
        ) : view.kind === "day" ? (
          <DayView
            date={view.date}
            entries={shown.filter((e) => e.entryDate === view.date)}
            customs={customs}
            onBack={() => show({ kind: "month" })}
            onAdd={() => show({ kind: "log", date: view.date })}
            onEdit={(entry) => show({ kind: "log", date: entry.entryDate, entry })}
            onDelete={remove}
          />
        ) : (
          <>
            <div className="hidden sm:flex">
              <button type="button" onClick={logToday} className="btd-btn-coral min-h-[56px] gap-2 px-7 py-3 text-base">
                <Icon name="plus" size={22} />
                Log today
              </button>
            </div>
            <MonthGrid
              entries={shown}
              customs={customs}
              month={month}
              onMonthChange={setMonth}
              onOpenDay={(date) => show({ kind: "day", date })}
            />
            {/* Pinned where a thumb can reach it on a phone. */}
            <div className="fixed inset-x-4 bottom-4 z-30 sm:hidden">
              <button
                type="button"
                onClick={logToday}
                className="btd-btn-coral min-h-[56px] w-full gap-2 px-6 py-3 text-base shadow-[0_8px_24px_rgba(33,50,68,0.25)]"
              >
                <Icon name="plus" size={22} />
                Log today
              </button>
            </div>
          </>
        )}

        <p className="text-13 text-muted">
          Voiced never diagnoses or suggests medicine. If someone is in danger, call 911.
        </p>
      </section>
    </div>
  );
}

function DayView({
  date,
  entries,
  customs,
  onBack,
  onAdd,
  onEdit,
  onDelete,
}: {
  date: string;
  entries: CalendarEntry[];
  customs: CustomSymptom[];
  onBack: () => void;
  onAdd: () => void;
  onEdit: (e: CalendarEntry) => void;
  onDelete: (e: CalendarEntry) => void;
}) {
  const future = date > todayKey();
  return (
    <div className="grid gap-5">
      <button type="button" onClick={onBack} className="justify-self-start text-sm font-bold text-link hover:underline">
        ← Back to the month
      </button>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-28 font-extrabold text-navy">{longDate(date)}</h2>
        {!future && (
          <button type="button" onClick={onAdd} className="btd-btn-coral min-h-[52px] gap-2 px-6 py-3 text-base">
            <Icon name="plus" size={20} />
            Add something for this day
          </button>
        )}
      </div>

      {entries.length === 0 ? (
        <div className="btd-card p-6">
          <p className="text-17 text-body">Nothing logged on this day yet.</p>
        </div>
      ) : (
        <ul className="grid gap-4">
          {entries.map((e) => (
            <li key={e.id} className="btd-card p-5">
              <div className="flex items-start gap-4">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-sky-tint text-navy">
                  <Icon name={entryIcon(e, customs)} size={26} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-17 font-extrabold text-navy">{entryTitle(e)}</p>
                    {e.checkInId && <span className="btd-tag bg-butter">From My Voice</span>}
                    {e.typical === "new" && <span className="btd-tag bg-coral/40">New or different</span>}
                  </div>
                  <p className="text-13 font-semibold text-muted">
                    {new Date(e.loggedAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                  </p>
                  <ul className="mt-2 grid gap-0.5 text-15 text-navy">
                    {[...detailLines(e, (id) => feeling(id).short, painSpotSentence), ...aboutLines(e)].map((l) => (
                      <li key={l}>{l}</li>
                    ))}
                    {e.note && <li className="italic">“{e.note}”</li>}
                  </ul>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" onClick={() => onEdit(e)} className="btd-btn-outline min-h-[44px] px-4 py-2 text-sm">
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(e)}
                  className="min-h-[44px] px-3 text-sm font-semibold text-clay hover:underline"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
