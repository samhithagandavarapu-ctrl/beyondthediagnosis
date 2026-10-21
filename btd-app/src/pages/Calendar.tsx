import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageHero from "../components/PageHero";
import Icon from "../components/icons/Icon";
import MonthGrid from "../components/calendar/MonthGrid";
import LogFlow from "../components/calendar/LogFlow";
import PracticeModeToggle from "../components/PracticeModeToggle";
import { BagChecklist, LearnMore, MealtimeReminder, MyPeriodCard, TellADoctor } from "../components/calendar/PeriodHelp";
import { addDays, predictNext } from "../lib/cycles";
import Patterns from "../components/calendar/Patterns";
import QuickCheck from "../components/calendar/QuickCheck";
import CalendarDataTools from "../components/calendar/CalendarDataTools";
import { sampleEntries } from "../lib/calendarSample";
import { useFamily } from "../lib/useFamily";
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
  isPeriodDay,
  listCustomSymptoms,
  listCustomSymptomsOf,
  listEntries,
  listEntriesOf,
  saveEntryFor,
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
  | { kind: "patterns" }
  | { kind: "quick" }
  | { kind: "data" }
  | { kind: "tray" }
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
  const { readingLevel, reloadCheckIns, say } = useMyVoice();

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

  // A linked grown-up can switch to a child's calendar. The database only
  // ever hands over what the child hasn't marked "Just for me".
  const family = useFamily();
  const [whose, setWhose] = useState<string | null>(null);
  const [childEntries, setChildEntries] = useState<CalendarEntry[]>([]);
  const [childCustoms, setChildCustoms] = useState<CustomSymptom[]>([]);
  const [childLoaded, setChildLoaded] = useState(false);
  const child = !practice && whose ? family.children.find((c) => c.personId === whose) ?? null : null;
  useEffect(() => {
    if (!child) return;
    let cancelled = false;
    setChildLoaded(false);
    Promise.all([listEntriesOf(child.personId), listCustomSymptomsOf(child.personId)]).then(([list, symptoms]) => {
      if (cancelled) return;
      setChildEntries(list);
      setChildCustoms(symptoms);
      setChildLoaded(true);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [child?.personId]);
  // Whose name to show on an entry a grown-up wrote in my calendar.
  const writerName = (e: CalendarEntry) => {
    if (!e.loggedBy || e.loggedBy === (e.userId ?? userId)) return null;
    if (e.loggedBy === userId) return "you";
    return family.grownUps.find((g) => g.personId === e.loggedBy)?.name ?? "a grown-up";
  };

  const [loads, setLoads] = useState(0);
  const reload = () => setLoads((n) => n + 1);
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
  }, [userId, authLoading, loads]);

  useEffect(() => {
    // Practice shows made-up sample data, and keeps nothing afterwards.
    setPracticeEntries(practice ? sampleEntries() : []);
  }, [practice]);

  const shown = practice ? practiceEntries : child ? childEntries : entries;
  const shownCustoms = child ? childCustoms : customs;
  const canHide = !child && !practice && family.grownUps.length > 0;
  const hasPeriods = shown.some((e) => e.category === "period");
  const prediction = predictNext(shown);
  const periodOn = (day: string) => shown.some((e) => e.entryDate === day && isPeriodDay(e));

  function show(next: View) {
    setView(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveMany(list: CalendarEntry[]): Promise<CalendarStore | "practice"> {
    if (practice) {
      setPracticeEntries((prev) => list.reduce(upsert, prev));
      return "practice";
    }
    setEntries((prev) => list.reduce(upsert, prev));
    return saveEntries(userId, list);
  }

  function toggleVisit(entry: CalendarEntry) {
    save({ ...entry, addToVisit: !entry.addToVisit, updatedAt: new Date().toISOString() });
  }

  const tray = shown.filter((e) => e.addToVisit);

  async function save(entry: CalendarEntry): Promise<CalendarStore | "practice"> {
    if (child && userId) {
      const theirs = { ...entry, userId: child.personId, loggedBy: userId, private: false };
      setChildEntries((prev) => upsert(prev, theirs));
      const res = await saveEntryFor(child.personId, userId, theirs);
      if (res.error) {
        window.alert(res.error);
        setChildEntries((prev) => prev.filter((e) => e.id !== theirs.id));
      }
      return "account";
    }
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
    if (child) {
      setChildEntries((prev) => prev.filter((e) => e.id !== entry.id));
      deleteEntries(userId, [entry.id]);
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

  const quickToday = () => {
    say("How's today?");
    show({ kind: "quick" });
  };
  const logToday = () => {
    say("Log today");
    show({ kind: "log", date: todayKey() });
  };

  return (
    <div>
      <PageHero
        eyebrow="My Calendar"
        title="Log how things are, day by day"
        lede="Tap a day to see it, or log something for today. Periods, pain, feelings, sleep — anything. Pick what to bring to your next appointment."
      />

      <section className="btd-container grid gap-6 pt-8 pb-28 sm:pb-20">
        {!privacySeen && !child && family.grownUps.length === 0 && (
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

        {!practice && family.children.length > 0 && (
          <div role="group" aria-label="Whose calendar?" className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-13 font-bold uppercase tracking-[0.08em] text-muted">Whose calendar?</span>
            {[{ id: null as string | null, label: "Mine" }, ...family.children.map((c) => ({ id: c.personId as string | null, label: c.name }))].map(
              (o) => (
                <button
                  key={o.id ?? "mine"}
                  type="button"
                  aria-pressed={whose === o.id}
                  onClick={() => {
                    setWhose(o.id);
                    say(o.id ? `${o.label}'s calendar` : "My calendar");
                    show({ kind: "month" });
                  }}
                  className={`min-h-[44px] rounded-full border-2 px-4 text-sm font-bold ${
                    whose === o.id ? "border-navy bg-sky text-navy" : "border-navy/15 bg-white text-navy hover:border-sky"
                  }`}
                >
                  {o.label}
                </button>
              )
            )}
          </div>
        )}

        {child && (
          <div className="flex flex-wrap items-center gap-3 rounded-card border-2 border-navy bg-sky-tint px-5 py-4">
            <Icon name="heart" size={24} className="text-navy" />
            <p className="min-w-0 flex-1 text-15 text-navy">
              <strong>You're looking at {child.name}'s calendar.</strong> Things {child.name} marks “Just
              for me” aren't shown here. You can add your own notes; only {child.name} can change theirs.
            </p>
          </div>
        )}

        {!child && !practice && family.grownUps.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 rounded-card border border-sky bg-sky-tint px-5 py-3">
            <Icon name="eye" size={22} className="text-navy" />
            <p className="min-w-0 flex-1 text-15 text-navy">
              {family.grownUps.map((g) => g.name).join(" and ")} can see this calendar, except anything you
              mark “Just for me”.{" "}
              <Link to="/profile?section=family" className="font-semibold text-link hover:underline">
                Family settings
              </Link>
            </p>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-13 text-muted">
            {child
              ? `${child.name}'s calendar, from their account.`
              : practice
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

        {practice && (
          <p className="rounded-tile border border-butter bg-butter/30 px-4 py-3 text-15 font-semibold text-navy">
            Practice mode: this is made-up sample data. Try anything; nothing is saved.
          </p>
        )}

        {loaded && (view.kind === "month" || view.kind === "patterns") && (
          <div role="tablist" aria-label="Calendar views" className="flex flex-wrap gap-2">
            {(
              [
                { id: "month", label: child ? `${child.name}'s calendar` : "My calendar", icon: "calendar" },
                { id: "patterns", label: child ? `${child.name}'s patterns` : "My patterns", icon: "repeat" },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={view.kind === t.id}
                onClick={() => {
                  say(t.label);
                  show({ kind: t.id });
                }}
                className={`flex min-h-[48px] items-center gap-2 rounded-full border-2 px-5 text-15 font-bold ${
                  view.kind === t.id ? "border-navy bg-navy text-mist" : "border-navy/15 bg-white text-navy hover:border-sky"
                }`}
              >
                <Icon name={t.icon} size={20} />
                {t.label}
              </button>
            ))}
          </div>
        )}

        {!loaded || (child && !childLoaded) ? (
          <p className="text-body">Loading your calendar…</p>
        ) : view.kind === "quick" ? (
          <QuickCheck
            date={todayKey()}
            readingLevel={readingLevel}
            practice={practice}
            canHide={canHide}
            onSave={saveMany}
            onDone={() => show({ kind: "month" })}
          />
        ) : view.kind === "patterns" ? (
          <Patterns entries={shown} readingLevel={readingLevel} />
        ) : view.kind === "data" ? (
          <div className="grid gap-5">
            <button type="button" onClick={() => show({ kind: "month" })} className="justify-self-start text-sm font-bold text-link hover:underline">
              ← Back to the month
            </button>
            <h2 className="font-display text-28 font-extrabold text-navy">My calendar data</h2>
            <p className="text-15 text-body">
              Saved on this device. Download a copy any time, or delete it for good.
            </p>
            <CalendarDataTools onChanged={reload} />
          </div>
        ) : view.kind === "log" ? (
          <LogFlow
            key={`${view.entry?.id ?? "new"}-${logRun}`}
            date={view.date}
            initial={view.entry}
            readingLevel={readingLevel}
            practice={practice}
            customSymptoms={shownCustoms}
            asCaregiverFor={child?.name}
            canHide={canHide}
            dayBeforeIsPeriod={periodOn(addDays(view.date, -1))}
            lastProducts={shown.find((e) => e.category === "period" && e.details.products?.length)?.details.products ?? []}
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
            customs={shownCustoms}
            periodDay={periodOn(view.date)}
            canChange={(e) => !child || e.loggedBy === userId}
            canPlan={!child}
            writerName={(e) => (child ? (e.loggedBy === userId ? "you" : null) : writerName(e))}
            teller={
              child
                ? (e) => {
                    const mine = e.loggedBy === userId;
                    if (e.reportedBy === "self") return child.name;
                    if (e.reportedBy === "both") return `${child.name} and ${mine ? "you" : "a grown-up"}`;
                    return mine ? "You" : "A grown-up";
                  }
                : undefined
            }
            onBack={() => show({ kind: "month" })}
            onAdd={() => show({ kind: "log", date: view.date })}
            onEdit={(entry) => show({ kind: "log", date: entry.entryDate, entry })}
            onDelete={remove}
            onToggleVisit={toggleVisit}
          />
        ) : view.kind === "tray" ? (
          <VisitTray
            entries={tray}
            customs={customs}
            onBack={() => show({ kind: "month" })}
            onRemove={toggleVisit}
          />
        ) : (
          <>
            <div className="hidden flex-wrap gap-3 sm:flex">
              {!child && <button type="button" onClick={quickToday} className="btd-btn-coral min-h-[56px] gap-2 px-7 py-3 text-base">
                <Icon name="hub-feelings" size={22} />
                How's today?
              </button>}
              <button type="button" onClick={logToday} className="btd-btn-outline min-h-[56px] gap-2 px-6 py-3 text-base">
                <Icon name="plus" size={22} />
                {child ? `Add a note to ${child.name}'s calendar` : "Log something"}
              </button>
            </div>
            {periodOn(todayKey()) && <MealtimeReminder />}
            {!child && tray.length > 0 && (
              <div className="flex flex-wrap items-center gap-3 rounded-card border-2 border-navy bg-butter px-5 py-3">
                <Icon name="star-filled" size={22} className="text-navy" />
                <p className="flex-1 text-15 font-bold text-navy">
                  {tray.length} {tray.length === 1 ? "thing" : "things"} saved for your visit
                </p>
                <button type="button" onClick={() => show({ kind: "tray" })} className="btd-btn min-h-[44px] bg-navy px-5 py-2 text-sm text-mist hover:bg-navy/90">
                  View
                </button>
              </div>
            )}
            <MonthGrid
              entries={shown}
              customs={shownCustoms}
              predicted={prediction?.days ?? []}
              month={month}
              onMonthChange={setMonth}
              onOpenDay={(date) => show({ kind: "day", date })}
            />
            {hasPeriods && (
              <section aria-label="My period" className="grid gap-4">
                <MyPeriodCard entries={shown} />
                <div className="grid gap-4 lg:grid-cols-2">
                  <BagChecklist />
                  <LearnMore />
                </div>
                <TellADoctor />
              </section>
            )}
            {/* Pinned where a thumb can reach it on a phone. */}
            <div className="fixed inset-x-4 bottom-4 z-30 flex gap-2 sm:hidden">
              <button
                type="button"
                onClick={child ? logToday : quickToday}
                className="btd-btn-coral min-h-[56px] flex-1 gap-2 px-4 py-3 text-base shadow-[0_8px_24px_rgba(33,50,68,0.25)]"
              >
                <Icon name={child ? "plus" : "hub-feelings"} size={22} />
                {child ? "Add a note" : "How's today?"}
              </button>
              <button
                type="button"
                onClick={logToday}
                aria-label="Log something"
                className="btd-btn min-h-[56px] bg-white px-4 text-navy shadow-[0_8px_24px_rgba(33,50,68,0.25)]"
              >
                <Icon name="plus" size={22} />
              </button>
            </div>
          </>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-13 text-muted">
            Voiced never diagnoses or suggests medicine. If someone is in danger, call 911.
          </p>
          {/* Signed in, the tools live on the Profile page; signed out, the
              calendar is only on this device, so they open right here. */}
          {child ? null : user ? (
            <Link to="/profile?section=calendar" className="text-13 font-semibold text-link hover:underline">
              Manage my data
            </Link>
          ) : (
            <button type="button" onClick={() => show({ kind: "data" })} className="text-13 font-semibold text-link hover:underline">
              Manage my data
            </button>
          )}
        </div>
      </section>
    </div>
  );
}

function DayView({
  date,
  entries,
  customs,
  periodDay,
  onBack,
  onAdd,
  onEdit,
  onDelete,
  onToggleVisit,
  canChange,
  canPlan,
  writerName,
  teller,
}: {
  date: string;
  entries: CalendarEntry[];
  customs: CustomSymptom[];
  periodDay: boolean;
  onBack: () => void;
  onAdd: () => void;
  onEdit: (e: CalendarEntry) => void;
  onDelete: (e: CalendarEntry) => void;
  onToggleVisit: (e: CalendarEntry) => void;
  /** Whether Edit and Delete show (a grown-up only changes what they wrote). */
  canChange: (e: CalendarEntry) => boolean;
  /** Whether "Add to my next appointment" shows (the owner's own tray). */
  canPlan: boolean;
  /** "you" or a grown-up's name, when someone other than the owner wrote it. */
  writerName: (e: CalendarEntry) => string | null;
  /** "Told by", worded for a grown-up looking at a child's calendar. */
  teller?: (e: CalendarEntry) => string;
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

      {periodDay && date === todayKey() && <MealtimeReminder />}

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
                    {e.private && (
                      <span className="btd-tag flex items-center gap-1 bg-navy text-mist">
                        <Icon name="lock" size={12} />
                        Just for me
                      </span>
                    )}
                    {writerName(e) && <span className="btd-tag bg-sky">Logged by {writerName(e)}</span>}
                    {e.typical === "new" && <span className="btd-tag bg-coral/40">New or different</span>}
                  </div>
                  <p className="text-13 font-semibold text-muted">
                    {new Date(e.loggedAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                  </p>
                  <ul className="mt-2 grid gap-0.5 text-15 text-navy">
                    {[...detailLines(e, (id) => feeling(id).short, painSpotSentence), ...aboutLines(e, false, teller)].map((l) => (
                      <li key={l}>{l}</li>
                    ))}
                    {e.note && <li className="italic">“{e.note}”</li>}
                  </ul>
                </div>
              </div>
              {canPlan && !e.checkInId && (
                <label className="mt-4 flex min-h-[44px] items-center gap-3 rounded-tile bg-mist px-4 text-15 font-semibold text-navy">
                  <input type="checkbox" className="h-5 w-5" checked={e.addToVisit} onChange={() => onToggleVisit(e)} />
                  Add to my next appointment
                  {e.addToVisit && <Icon name="star-filled" size={16} className="text-coral-hover" />}
                </label>
              )}
              {canChange(e) && <div className="mt-4 flex flex-wrap gap-2">
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
              </div>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Everything ticked "Add to my next appointment", ready for Appointment Prep. */
function VisitTray({
  entries,
  customs,
  onBack,
  onRemove,
}: {
  entries: CalendarEntry[];
  customs: CustomSymptom[];
  onBack: () => void;
  onRemove: (e: CalendarEntry) => void;
}) {
  return (
    <div className="grid gap-5">
      <button type="button" onClick={onBack} className="justify-self-start text-sm font-bold text-link hover:underline">
        ← Back to the month
      </button>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-28 font-extrabold text-navy">Saved for my visit</h2>
        {entries.length > 0 && (
          <Link to="/appointment-prep?fromCalendar=tray" className="btd-btn-coral min-h-[52px] gap-2 px-6 py-3 text-base">
            Bring them into Appointment Prep →
          </Link>
        )}
      </div>
      {entries.length === 0 ? (
        <div className="btd-card p-6">
          <p className="text-17 text-body">Nothing saved yet. Open a day and tick "Add to my next appointment".</p>
        </div>
      ) : (
        <ul className="grid gap-3">
          {entries.map((e) => (
            <li key={e.id} className="btd-card flex flex-wrap items-center gap-4 p-4">
              <Icon name={entryIcon(e, customs)} size={26} className="text-navy" />
              <div className="min-w-0 flex-1">
                <p className="text-15 font-extrabold text-navy">{entryTitle(e)}</p>
                <p className="text-13 text-muted">{longDate(e.entryDate)}</p>
              </div>
              <button type="button" onClick={() => onRemove(e)} className="min-h-[44px] px-3 text-sm font-semibold text-link hover:underline">
                Take it off
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
