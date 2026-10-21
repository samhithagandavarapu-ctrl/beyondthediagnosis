import { ForLabel } from "../components/ModeBanner";
import NeedsChild from "../components/family/NeedsChild";
import { possessive, useAccountMode } from "../context/AccountModeContext";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Icon from "../components/icons/Icon";
import MonthGrid from "../components/calendar/MonthGrid";
import LogFlow from "../components/calendar/LogFlow";
import QuickLog from "../components/calendar/QuickLog";
import PeriodScreen from "../components/calendar/PeriodScreen";
import WeekStrip from "../components/calendar/WeekStrip";
import DayList from "../components/calendar/DayList";
import PracticeModeToggle from "../components/PracticeModeToggle";
import { MealtimeReminder, MyPeriodCard } from "../components/calendar/PeriodHelp";
import { addDays, predictNext } from "../lib/cycles";
import Patterns from "../components/calendar/Patterns";
import CalendarDataTools from "../components/calendar/CalendarDataTools";
import { sampleEntries } from "../lib/calendarSample";
import { useFamily } from "../lib/useFamily";
import { useAuth } from "../context/AuthContext";
import { useMyVoice } from "../context/MyVoiceContext";
import { usePracticeMode } from "../context/PracticeModeContext";
import { GROUPS, GroupId, group } from "../lib/calendarGroups";
import {
  CalendarEntry,
  CalendarStore,
  CustomSymptom,
  addCustomSymptom,
  deleteEntries,
  entryIcon,
  entryTitle,
  fromDateKey,
  isPeriodDay,
  listCustomSymptoms,
  listCustomSymptomsOf,
  listEntries,
  listEntriesOf,
  saveEntryFor,
  longDate,
  newEntry,
  saveEntries,
  sortEntries,
  todayKey,
} from "../lib/calendar";

// The Symptom Calendar. It opens on Today: a week strip, six big tiles, and
// what's been logged so far. Logging is one question per screen (QuickLog);
// the period has its own screen; the month, patterns and the rest are one
// tap away. Nothing here is ever sent to the AI assistant.

type View =
  | { kind: "today" }
  | { kind: "log"; start: Exclude<GroupId, "period">; date: string }
  | { kind: "period" }
  | { kind: "edit"; entry: CalendarEntry }
  | { kind: "month" }
  | { kind: "patterns" }
  | { kind: "data" }
  | { kind: "tray" };

const PRIVACY_SEEN_KEY = "voiced:calendar-privacy-seen";

function upsert(list: CalendarEntry[], entry: CalendarEntry) {
  return sortEntries([entry, ...list.filter((e) => e.id !== entry.id)]);
}

export default function Calendar() {
  const { user, loading: authLoading } = useAuth();
  const { mode, managed, forName } = useAccountMode();
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
  const [view, setView] = useState<View>({ kind: "today" });
  const [month, setMonth] = useState(todayKey());
  // The day Today is showing (the week strip and the month pick it).
  const [day, setDay] = useState(todayKey());
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
  // A parent's calendar is always the child they're managing (the bar at the
  // top switches who); there's no calendar of the parent's own.
  const whoseId = mode === "parent" ? managed?.personId ?? null : whose;
  const child = !practice && whoseId ? family.children.find((c) => c.personId === whoseId) ?? null : null;
  const noChildYet = mode === "parent" && !managed;
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

  const today = todayKey();
  const isToday = day === today;
  const ownerName = child?.name;
  const canChange = (e: CalendarEntry) => (child ? e.loggedBy === userId : !e.loggedBy || e.loggedBy === userId);
  const canDelete = (e: CalendarEntry) => !child || e.loggedBy === userId;
  const listWriter = (e: CalendarEntry) => (child ? (e.loggedBy === userId ? "you" : null) : writerName(e));
  const teller = child
    ? (e: CalendarEntry) => {
        const mine = e.loggedBy === userId;
        if (e.reportedBy === "self") return child.name;
        if (e.reportedBy === "both") return `${child.name} and ${mine ? "you" : "a grown-up"}`;
        return mine ? "You" : "A grown-up";
      }
    : undefined;
  const dayList = (key: string, empty?: string) => (
    <DayList
      entries={shown.filter((e) => e.entryDate === key)}
      all={shown}
      canChange={canChange}
      canDelete={canDelete}
      canPlan={!child}
      writerName={listWriter}
      teller={teller}
      onEdit={(entry) => show({ kind: "edit", entry })}
      onDelete={remove}
      onToggleVisit={toggleVisit}
      empty={empty}
    />
  );

  function startLog(g: GroupId) {
    say(group(g).label);
    if (g === "period") {
      if (isToday) return show({ kind: "period" });
      // A day gone by: the full period form for that day.
      return show({ kind: "edit", entry: newEntry({ entryDate: day, category: "period", reportedBy: child ? "caregiver" : "self", details: {} }) });
    }
    show({ kind: "log", start: g, date: day });
  }

  const back = () => show({ kind: "today" });

  if (noChildYet && !practice) {
    return (
      <section className="btd-container pt-8 pb-20">
        <NeedsChild what="The calendar" />
      </section>
    );
  }

  return (
    <div>
      <section className="btd-container grid gap-6 pt-8 pb-20">
        <ForLabel className="justify-self-start" />
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

        {!practice && family.children.length > 0 && mode !== "parent" && (
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
                    show({ kind: "today" });
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

        {practice && (
          <p className="rounded-tile border border-butter bg-butter/30 px-4 py-3 text-15 font-semibold text-navy">
            Practice mode: this is made-up sample data. Try anything; nothing is saved.
          </p>
        )}

        {!loaded || (child && !childLoaded) ? (
          <p className="text-body">Loading your calendar…</p>
        ) : view.kind === "log" ? (
          <QuickLog
            key={`${view.start}-${logRun}`}
            start={view.start}
            date={view.date}
            practice={practice}
            customSymptoms={shownCustoms}
            asCaregiverFor={child?.name}
            canHide={canHide}
            canPlan={!child}
            onSave={save}
            onAddCustomSymptom={addSymptom}
            onDone={back}
            onLogAnother={back}
          />
        ) : view.kind === "period" ? (
          <PeriodScreen
            entries={shown}
            practice={practice}
            asCaregiverFor={child?.name}
            mine={canChange}
            onSave={save}
            onMore={(entry) => show({ kind: "edit", entry })}
            onBack={back}
          />
        ) : view.kind === "edit" ? (
          <LogFlow
            key={view.entry.id}
            date={view.entry.entryDate}
            initial={view.entry}
            readingLevel={readingLevel}
            practice={practice}
            customSymptoms={shownCustoms}
            asCaregiverFor={child?.name}
            canHide={canHide}
            dayBeforeIsPeriod={periodOn(addDays(view.entry.entryDate, -1))}
            lastProducts={shown.find((e) => e.category === "period" && e.details.products?.length)?.details.products ?? []}
            onAddCustomSymptom={addSymptom}
            onSave={save}
            onLogAnother={back}
            onDone={back}
          />
        ) : view.kind === "patterns" ? (
          <div className="grid gap-5">
            <MonthTabs current="patterns" child={ownerName} onPick={(k) => show({ kind: k })} onBack={back} />
            <Patterns entries={shown} readingLevel={readingLevel} />
          </div>
        ) : view.kind === "data" ? (
          <div className="grid gap-5">
            <button type="button" onClick={back} className="justify-self-start text-sm font-bold text-link hover:underline">
              ← Back to today
            </button>
            <h2 className="font-display text-28 font-extrabold text-navy">My calendar data</h2>
            <p className="text-15 text-body">Saved on this device. Download a copy any time, or delete it for good.</p>
            <CalendarDataTools onChanged={reload} />
          </div>
        ) : view.kind === "tray" ? (
          <VisitTray entries={tray} customs={customs} onBack={back} onRemove={toggleVisit} />
        ) : view.kind === "month" ? (
          <div className="grid gap-5">
            <MonthTabs current="month" child={ownerName} onPick={(k) => show({ kind: k })} onBack={back} />
            {!child && tray.length > 0 && <TrayBanner count={tray.length} onOpen={() => show({ kind: "tray" })} />}
            <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
              <MonthGrid
                entries={shown}
                customs={shownCustoms}
                predicted={prediction?.days ?? []}
                month={month}
                selected={day}
                onMonthChange={setMonth}
                onOpenDay={(key) => setDay(key)}
              />
              <div className="grid gap-4 rounded-card bg-white p-5 lg:sticky lg:top-28">
                <h2 className="text-21 font-extrabold text-navy">{longDate(day)}</h2>
                {dayList(day, "Nothing logged on this day.")}
                {day <= today && (
                  <button
                    type="button"
                    onClick={() => {
                      say("Log something for this day");
                      show({ kind: "today" });
                    }}
                    className="btd-btn-coral min-h-[56px] w-full px-6 py-3 text-base"
                  >
                    Log something for this day
                  </button>
                )}
              </div>
            </div>
            {hasPeriods && <MyPeriodCard entries={shown} />}
          </div>
        ) : (
          <div className="mx-auto grid w-full max-w-2xl gap-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="btd-eyebrow">
                  {child ? `${possessive(child.name)} calendar` : mode === "parent" && forName ? `${possessive(forName)} calendar` : "My calendar"}
                </p>
                <h1 className="font-display text-[2rem] font-extrabold leading-tight text-navy sm:text-[2.4rem]">
                  {isToday
                    ? `Today, ${fromDateKey(day).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}`
                    : longDate(day)}
                </h1>
              </div>
              {!isToday && (
                <button type="button" onClick={() => setDay(today)} className="btd-btn-outline min-h-[44px] px-4 py-2 text-sm">
                  Back to today
                </button>
              )}
            </div>

            <WeekStrip entries={shown} selected={day} onPick={setDay} onMonth={() => { setMonth(day); show({ kind: "month" }); }} />

            {!child && tray.length > 0 && <TrayBanner count={tray.length} onOpen={() => show({ kind: "tray" })} />}
            {isToday && periodOn(today) && <MealtimeReminder />}

            <h2 className="font-display text-23 font-extrabold text-navy">
              {child ? `Add a note for ${child.name}` : isToday ? "What's happening?" : "What happened that day?"}
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {GROUPS.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => startLog(g.id)}
                  className={`flex min-h-[88px] items-center gap-3 rounded-card border-2 p-3 text-left transition-transform hover:scale-[1.02] ${g.tile}`}
                >
                  <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white ${g.ink}`}>
                    <Icon name={g.icon} size={22} />
                  </span>
                  <span className="text-17 font-extrabold leading-tight text-navy">{child && g.id === "period" ? "Period" : g.label}</span>
                </button>
              ))}
            </div>

            <div className="grid gap-3 rounded-card bg-white p-5">
              <h2 className="text-17 font-extrabold text-navy">{isToday ? "Today so far" : "That day"}</h2>
              {dayList(day, isToday ? "Nothing yet. Tap a button above to start." : "Nothing logged on this day.")}
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-13 text-muted">
            Voiced never diagnoses or suggests medicine. If someone is in danger, call 911.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <p className="text-13 text-muted">
              {child
                ? `${child.name}'s calendar, from their account.`
                : practice
                  ? "Practice mode is on. Nothing is saved."
                  : store === "account"
                    ? "Saved to your account."
                    : accountMissing
                      ? "Saved on this device for now."
                      : "Saved on this device only."}{" "}
              {!user && !practice && (
                <Link to="/login" className="font-semibold text-link hover:underline">
                  Sign in to keep it safe.
                </Link>
              )}
            </p>
            {child ? null : user ? (
              <Link to="/profile?section=calendar" className="text-13 font-semibold text-link hover:underline">
                Manage my data
              </Link>
            ) : (
              <button type="button" onClick={() => show({ kind: "data" })} className="text-13 font-semibold text-link hover:underline">
                Manage my data
              </button>
            )}
            <PracticeModeToggle tone="light" />
          </div>
        </div>
      </section>
    </div>
  );
}

/** The month's own tabs: the calendar, and patterns. */
function MonthTabs({
  current,
  child,
  onPick,
  onBack,
}: {
  current: "month" | "patterns";
  child?: string;
  onPick: (k: "month" | "patterns") => void;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={onBack}
        aria-label="Back to today"
        className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white text-navy shadow-sm hover:bg-sky-tint"
      >
        <Icon name="chevron-right" size={22} className="rotate-180" />
      </button>
      <div role="tablist" aria-label="Calendar views" className="flex flex-wrap gap-2">
        {(
          [
            { id: "month", label: child ? `${child}'s month` : "My month", icon: "calendar" },
            { id: "patterns", label: child ? `${child}'s patterns` : "My patterns", icon: "repeat" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={current === t.id}
            onClick={() => onPick(t.id)}
            className={`flex min-h-[48px] items-center gap-2 rounded-full border-2 px-5 text-15 font-bold ${
              current === t.id ? "border-navy bg-navy text-mist" : "border-navy/15 bg-white text-navy hover:border-sky"
            }`}
          >
            <Icon name={t.icon} size={20} />
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function TrayBanner({ count, onOpen }: { count: number; onOpen: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-card border-2 border-navy bg-butter px-5 py-3">
      <Icon name="star-filled" size={22} className="text-navy" />
      <p className="flex-1 text-15 font-bold text-navy">
        {count} {count === 1 ? "thing" : "things"} saved for your visit
      </p>
      <button type="button" onClick={onOpen} className="btd-btn min-h-[44px] bg-navy px-5 py-2 text-sm text-mist hover:bg-navy/90">
        View
      </button>
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
        ← Back to today
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
