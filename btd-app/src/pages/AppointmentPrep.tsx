import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { refineAppointmentForm } from "../lib/api";
import { useMyVoice } from "../context/MyVoiceContext";
import { usePracticeMode } from "../context/PracticeModeContext";
import { useAuth } from "../context/AuthContext";
import {
  HistoryEntry,
  addToHistory,
  entryCheckIns,
  formIsEmpty,
  historyTitle,
  loadHistory,
  removeFromHistory,
} from "../lib/appointmentHistory";
import {
  Draft,
  DraftStore,
  deleteDraft,
  draftLabel,
  emptyForm,
  emptyMedication,
  emptyQuestion,
  emptyRuledOut,
  emptySymptom,
  getActiveDraftId,
  listDrafts,
  newDraft,
  newId,
  saveDraft,
  setActiveDraftId,
} from "../lib/drafts";
import { shortDate } from "../lib/shortDate";
import { CheckIn, checkInLines, emptyCheckIn, feelingsOverTime, painSummaryLine } from "../lib/myVoice";
import { CheckInSummary, FeelingsOverTime } from "../components/myvoice/CheckInHistory";
import CheckInFlow from "../components/myvoice/CheckInFlow";
import CalendarImport from "../components/calendar/CalendarImport";
import {
  CalendarEntry,
  CustomSymptom,
  listCustomSymptoms,
  listCustomSymptomsOf,
  listEntries,
  listEntriesOf,
  saveEntries,
} from "../lib/calendar";
import { useFamily } from "../lib/useFamily";
import { CalendarPageText, calendarPageText, toSymptoms, unmerge } from "../lib/calendarImport";
import { aboutLines, detailLines } from "../lib/calendar";
import { cycles } from "../lib/cycles";
import { feeling, painSpotSentence } from "../lib/myVoice";
import { AboutMeCopy, NoteId, aboutMeRows, boardHasContent, copyBoard, meNote } from "../lib/meBoard";
import Icon from "../components/icons/Icon";
import DictateButton from "../components/DictateButton";
import SymptomTimeline from "../components/timeline/SymptomTimeline";
import {
  Timeline,
  TimelineEntry as TimelineEntryT,
  emptyTimeline,
  filledEntries,
  groupByMonth,
  isBigChange,
  nearbyEntries,
  sortEntries,
  timelineType,
} from "../lib/timeline";
import {
  AppointmentForm,
  Medication,
  Question,
  RuledOutItem,
  Symptom,
  buildAppointmentPdf,
  printPdf,
  medicationLine,
  symptomDetail,
  SYMPTOM_AREAS,
  SYMPTOM_REPORTERS,
  SYMPTOM_TRAJECTORIES,
  timelineDetail,
} from "../lib/appointmentPdf";
import { inkLastWord } from "../components/Scribble";
import { ForLabel } from "../components/ModeBanner";
import NeedsChild from "../components/family/NeedsChild";
import { possessive, useAccountMode, useWhose } from "../context/AccountModeContext";

export default function AppointmentPrep() {
  const { checkIns, checkInsLoaded, importCheckIns, meBoard, meBoardLoaded } = useMyVoice();
  const { practice } = usePracticeMode();
  const { user, loading: authLoading } = useAuth();
  // Whose visit this is, so every label says so: "Maya's symptoms" for a
  // parent, "My symptoms" in someone's own space.
  const { view, mode, forName, subjectId, forOther } = useAccountMode();
  // Drafts and the calendar belong to the person the visit is for: a parent
  // works on their child's (the same ones the child sees).
  const userId = user?.id ?? null;
  const ownerId = userId ? subjectId : null;
  const whose = useWhose();
  const self = view === "self";
  const parentFor = mode === "parent" && !self ? forName : null;
  const calendarLabel = parentFor ? `${possessive(parentFor)} calendar` : "my calendar";

  // Drafts: the one open now, and the rest. They live in the account when
  // signed in and on this device otherwise (see lib/drafts.ts).
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [store, setStore] = useState<DraftStore>("device");
  const [accountMissing, setAccountMissing] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [draftId, setDraftId] = useState<string>(() => newId());
  const [draftName, setDraftName] = useState("");
  const [draftMyVoice, setDraftMyVoice] = useState<CheckIn | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "failed">("idle");
  // What was last written (or just opened), so opening a draft doesn't count
  // as a change.
  const lastSaved = useRef("");
  const [form, setForm] = useState<AppointmentForm>(emptyForm);
  const [history, setHistory] = useState<HistoryEntry[]>(loadHistory);
  // A past summary being looked at, rather than the one being written now.
  const [viewing, setViewing] = useState<HistoryEntry | null>(null);
  // Which My Voice check-ins go on the summary. Until someone ticks or
  // unticks one, that's the newest — plus any sent here from My Voice with
  // "Put it on my doctor sheet".
  const [searchParams] = useSearchParams();
  const linkedCheckIn = searchParams.get("checkIn");
  const [picked, setPicked] = useState<string[] | null>(null);
  const pickedIds =
    picked ?? [checkIns[0]?.id, linkedCheckIn].filter((id): id is string => Boolean(id));
  const pickedCheckIns = checkIns.filter((c) => pickedIds.includes(c.id));
  function togglePicked(id: string) {
    setPicked(pickedIds.includes(id) ? pickedIds.filter((x) => x !== id) : [...pickedIds, id]);
  }
  const [showSummary, setShowSummary] = useState(false);
  const [refining, setRefining] = useState(false);
  const [refineError, setRefineError] = useState<string | null>(null);

  // The Symptom Calendar, read so entries can be picked and brought in. It's
  // only ever shown here and printed; never sent to "Refine with AI".
  const [calEntries, setCalEntries] = useState<CalendarEntry[]>([]);
  const [calCustoms, setCalCustoms] = useState<CustomSymptom[]>([]);
  const [calLoaded, setCalLoaded] = useState(false);
  const [importing, setImporting] = useState(searchParams.get("fromCalendar") === "tray");
  const [importNote, setImportNote] = useState<string | null>(null);
  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    const load = forOther && ownerId
      ? Promise.all([listEntriesOf(ownerId).then((entries) => ({ entries })), listCustomSymptomsOf(ownerId)])
      : Promise.all([listEntries(userId), listCustomSymptoms(userId)]);
    load.then(([res, customs]) => {
      if (cancelled) return;
      setCalEntries(res.entries);
      setCalCustoms(customs);
      setCalLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [userId, authLoading, ownerId, forOther]);
  // A linked grown-up can bring in from a child's calendar too (only what the
  // child hasn't marked "Just for me" ever reaches here).
  const family = useFamily();
  const [importFrom, setImportFrom] = useState<string | null>(null);
  const [childCals, setChildCals] = useState<Record<string, { entries: CalendarEntry[]; customs: CustomSymptom[] }>>({});
  useEffect(() => {
    if (!importFrom || childCals[importFrom]) return;
    Promise.all([listEntriesOf(importFrom), listCustomSymptomsOf(importFrom)]).then(([entries, customs]) =>
      setChildCals((prev) => ({ ...prev, [importFrom]: { entries, customs } }))
    );
  }, [importFrom, childCals]);
  // Everything that could be on this draft: mine, and any child's loaded.
  const calPool = [...calEntries, ...Object.values(childCals).flatMap((c) => c.entries)];
  const ownerOf = (e: CalendarEntry) => e.userId ?? userId;
  const importedIds = new Set(form.symptoms.flatMap((s) => s.calendar?.entryIds ?? []));
  /** The page "From my symptom calendar" for a form, if it's included. */
  function calendarPageFor(f: AppointmentForm): CalendarPageText | null {
    const page = f.calendarPage;
    if (!page?.include) return null;
    const picked = calPool.filter((e) => page.entryIds.includes(e.id));
    if (!picked.length) return null;
    // Cycle lengths come from the whole of that person's calendar.
    const owner = ownerOf(picked[0]);
    return calendarPageText(
      picked,
      page.from,
      page.to,
      (e) => [...detailLines(e, (id) => feeling(id).short, painSpotSentence), ...aboutLines(e, true)],
      cycles(calPool.filter((e) => ownerOf(e) === owner))
    );
  }

  /** Add picked entries as symptoms (after what's there, filling empty rows
   *  first), the confirmed medicines, and the range for the PDF page. */
  function importFromCalendar(picked: CalendarEntry[], from: string, to: string, medicines: string[]) {
    const fresh = picked.filter((e) => !importedIds.has(e.id));
    const added = toSymptoms(fresh, from, to, newId);
    setForm((f) => {
      const blankSymptom = (x: Symptom) => !x.description.trim() && !x.onset.trim() && !x.calendar;
      const kept = f.symptoms.filter((x) => !blankSymptom(x));
      const blankMed = (m: { name: string; dose: string; frequency: string }) =>
        !m.name.trim() && !m.dose.trim() && !m.frequency.trim();
      const have = new Set(f.medications.map((m) => m.name.trim().toLowerCase()));
      const meds = medicines
        .filter((m) => !have.has(m.toLowerCase()))
        .map((name) => ({ ...emptyMedication(), name, fromCalendar: true }));
      const page = f.calendarPage;
      return {
        ...f,
        symptoms: [...kept, ...added].length ? [...kept, ...added] : f.symptoms,
        medications: meds.length ? [...f.medications.filter((m) => !blankMed(m)), ...meds] : f.medications,
        calendarPage: {
          include: page?.include ?? true,
          entryIds: [...new Set([...(page?.entryIds ?? []), ...fresh.map((e) => e.id)])],
          from: page && page.from < from ? page.from : from,
          to: page && page.to > to ? page.to : to,
        },
      };
    });
    // Brought in: off the visit tray.
    // Only my own tray: a child's tray is theirs to keep.
    const fromTray = fresh
      .filter((e) => e.addToVisit && ownerOf(e) === userId)
      .map((e) => ({ ...e, addToVisit: false }));
    if (fromTray.length && !practice) {
      setCalEntries((prev) => prev.map((e) => fromTray.find((t) => t.id === e.id) ?? e));
      saveEntries(userId, fromTray);
    }
    setImporting(false);
    setImportNote(
      `Brought in ${fresh.length} ${fresh.length === 1 ? "entry" : "entries"} as ${added.length} ${
        added.length === 1 ? "symptom" : "symptoms"
      }${medicines.length ? ` and ${medicines.length} ${medicines.length === 1 ? "medicine" : "medicines"}` : ""}. Check them below before you make the summary.`
    );
  }

  function splitSymptom(s: Symptom) {
    const own = calPool.filter((e) => s.calendar?.entryIds.includes(e.id));
    if (own.length < 2) return;
    const range = form.calendarPage ?? { from: own[0].entryDate, to: own[own.length - 1].entryDate };
    const parts = unmerge(own, range.from, range.to, newId);
    setForm((f) => ({ ...f, symptoms: f.symptoms.flatMap((x) => (x.id === s.id ? parts : [x])) }));
  }

  // Drafts saved before the timeline existed have none; treat that as empty.
  const timeline = form.timeline ?? emptyTimeline();

  // "More you can add" starts folded. It opens by itself when something typed
  // into it is already there (an opened draft), so nothing is hidden.
  const typedOptional =
    timeline.usualSelf.trim() !== "" ||
    timeline.entries.length > 0 ||
    form.ruledOut.some((r) => r.description.trim() || r.when.trim()) ||
    form.accommodations.trim() !== "";
  const [moreOpen, setMoreOpen] = useState(false);
  useEffect(() => {
    if (typedOptional) setMoreOpen(true);
  }, [typedOptional]);
  // What's in there and going on the summary, shown on the folded header.
  const aboutMeOn =
    form.aboutMe?.notes.filter((n) => n.lines.length && !form.aboutMe?.off.includes(n.id)).length ?? 0;
  const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
  const included = [
    aboutMeOn && plural(aboutMeOn, parentFor ? "note from the Me board" : "note from my Me page", parentFor ? "notes from the Me board" : "notes from my Me page"),
    timeline.entries.length && plural(timeline.entries.length, "timeline entry", "timeline entries"),
  ].filter(Boolean);
  const moreSummary = included.length
    ? `On the summary: ${included.join(" · ")}`
    : "Me page, symptom timeline, what's been ruled out, and communication needs";
  const refinableEntries = filledEntries(timeline);

  async function handleRefine() {
    setRefining(true);
    setRefineError(null);
    const ownSymptoms = form.symptoms.filter((s) => !s.calendar);
    const ownMeds = form.medications.filter((m) => !m.fromCalendar);
    try {
      const refined = await refineAppointmentForm({
        reasonForVisit: form.reasonForVisit,
        // Calendar data never goes to the AI: rows brought in from the
        // calendar (and medicines confirmed from it) stay out, untouched.
        symptoms: ownSymptoms.map((s) => ({ description: s.description, onset: s.onset })),
        medications: ownMeds.map((m) => ({
          name: m.name,
          dose: m.dose,
          frequency: m.frequency,
        })),
        ruledOut: form.ruledOut.map((r) => ({ description: r.description, when: r.when })),
        accommodations: form.accommodations,
        questions: form.questions.map((q) => q.text),
        // Only entries with something written; the reply comes back in the
        // same order, and is matched back to them by position.
        timeline: {
          usualSelf: timeline.usualSelf,
          entries: refinableEntries.map((e) => ({
            description: e.description,
            notes: e.notes,
            stoppedWhen: e.stoppedWhen,
          })),
        },
      });
      const refinedEntries = refined.timeline?.entries;
      const sameCount = refinedEntries?.length === refinableEntries.length;
      const refinedById = new Map(
        sameCount ? refinableEntries.map((e, i) => [e.id, refinedEntries![i]] as const) : []
      );

      setForm((f) => ({
        ...f,
        reasonForVisit: refined.reasonForVisit ?? f.reasonForVisit,
        accommodations: refined.accommodations ?? f.accommodations,
        symptoms:
          refined.symptoms?.length
            ? [
                ...refined.symptoms.map((s, i) => ({
                  ...ownSymptoms[i],
                  id: ownSymptoms[i]?.id ?? newId(),
                  description: s.description,
                  onset: s.onset,
                  baselineOrNew: ownSymptoms[i]?.baselineOrNew ?? "new",
                })),
                ...f.symptoms.filter((s) => s.calendar),
              ]
            : f.symptoms,
        medications:
          refined.medications?.length
            ? [
                ...refined.medications.map((m, i) => ({
                  id: ownMeds[i]?.id ?? newId(),
                  name: m.name,
                  dose: m.dose,
                  frequency: m.frequency,
                })),
                ...f.medications.filter((m) => m.fromCalendar),
              ]
            : f.medications,
        ruledOut:
          refined.ruledOut?.length
            ? refined.ruledOut.map((r, i) => ({
                id: f.ruledOut[i]?.id ?? newId(),
                description: r.description,
                when: r.when,
              }))
            : f.ruledOut,
        questions:
          refined.questions?.length
            ? refined.questions.map((text, i) => ({
                id: f.questions[i]?.id ?? newId(),
                text,
              }))
            : f.questions,
        // Wording only: types, dates, and every answer stay exactly as chosen.
        // If the reply doesn't line up one-to-one, the entries are left alone.
        timeline: {
          ...(f.timeline ?? emptyTimeline()),
          usualSelf: refined.timeline?.usualSelf ?? (f.timeline?.usualSelf ?? ""),
          entries: (f.timeline?.entries ?? []).map((e) => {
            const r = refinedById.get(e.id);
            if (!r) return e;
            return {
              ...e,
              description: r.description?.trim() ? r.description : e.description,
              notes: typeof r.notes === "string" ? r.notes : e.notes,
              stoppedWhen: typeof r.stoppedWhen === "string" ? r.stoppedWhen : e.stoppedWhen,
            };
          }),
        },
      }));
    } catch (err: unknown) {
      setRefineError(
        err instanceof Error && err.message
          ? `${err.message} Your draft is unchanged.`
          : "Couldn't polish this right now. Your draft is unchanged."
      );
    } finally {
      setRefining(false);
    }
  }

  // One helper per list keeps the update sites short and identical in shape.
  function updateItem<K extends "symptoms" | "medications" | "ruledOut" | "questions">(
    key: K,
    id: string,
    patch: Partial<AppointmentForm[K][number]>
  ) {
    setForm((f) => ({
      ...f,
      [key]: (f[key] as { id: string }[]).map((entry) =>
        entry.id === id ? { ...entry, ...patch } : entry
      ),
    }));
  }

  function addItem<K extends "symptoms" | "medications" | "ruledOut" | "questions">(
    key: K,
    make: () => AppointmentForm[K][number]
  ) {
    setForm((f) => ({ ...f, [key]: [...(f[key] as unknown[]), make()] }));
  }

  function removeItem(
    key: "symptoms" | "medications" | "ruledOut" | "questions",
    id: string
  ) {
    setForm((f) => ({
      ...f,
      [key]: (f[key] as { id: string }[]).filter((entry) => entry.id !== id),
    }));
  }

  // The profile's "see all" links to /appointment-prep#history; the app
  // scrolls to the top on every page change, so go there after that.
  const { hash } = useLocation();
  useEffect(() => {
    if (hash !== "#history") return;
    requestAnimationFrame(() =>
      document.getElementById("history")?.scrollIntoView({ block: "start" })
    );
  }, [hash]);

  function snapshot(name: string, f: AppointmentForm, mv: CheckIn | null) {
    return JSON.stringify({ name, f, mv });
  }

  function openDraft(d: Draft) {
    setDraftId(d.id);
    setDraftName(d.name);
    setForm(d.form);
    setDraftMyVoice(d.myVoice);
    setActiveDraftId(d.id);
    setRefineError(null);
    lastSaved.current = snapshot(d.name, d.form, d.myVoice);
  }

  // Load the drafts once we know who's here, and again if that changes
  // (signing in brings this device's drafts into the account).
  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    setLoaded(false);
    if (userId && !ownerId) {
      // A parent who hasn't added a child yet: nothing to open.
      openDraft(newDraft());
      setLoaded(true);
      return;
    }
    listDrafts(userId, ownerId).then((res) => {
      if (cancelled) return;
      setDrafts(res.drafts);
      setStore(res.store);
      setAccountMissing(res.accountMissing);
      const activeId = getActiveDraftId();
      openDraft(res.drafts.find((d) => d.id === activeId) ?? res.drafts[0] ?? newDraft());
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, authLoading, ownerId]);

  // A draft keeps its own copy of the Me board, taken the first time it's
  // open with a board to copy (so, for a new draft, when it's started). A
  // later change to the board reaches it only through "Update from my Me
  // page". A board kept about someone else gives the patient name too.
  const boardName = (mode !== "none" ? forName : null) ?? meBoard?.aboutName.trim() ?? "";
  useEffect(() => {
    if (!loaded || !meBoardLoaded) return;
    setForm((f) => {
      let next = f;
      if (!f.aboutMe && boardHasContent(meBoard)) next = { ...next, aboutMe: copyBoard(meBoard) };
      if (boardName && !f.patientName.trim() && formIsEmpty(f)) next = { ...next, patientName: boardName };
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftId, loaded, meBoardLoaded, boardName]);

  // Check-ins that only live on older drafts join the My Voice list, so
  // they can be picked like any other.
  useEffect(() => {
    if (!loaded || !checkInsLoaded) return;
    importCheckIns(drafts.map((d) => d.myVoice).filter((c): c is CheckIn => Boolean(c)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, checkInsLoaded]);

  // Saved as you type, a moment after you stop. Practice mode is a rehearsal,
  // so it keeps nothing — the real draft is left exactly as it was.
  useEffect(() => {
    if (!loaded || practice) return;
    const snap = snapshot(draftName, form, draftMyVoice);
    if (snap === lastSaved.current) return;
    // A draft holding nothing but what was filled in for it (the name from
    // the Me board) isn't worth keeping yet.
    const typed = form.patientName.trim() === boardName ? { ...form, patientName: "" } : form;
    if (formIsEmpty(typed) && !draftMyVoice && !draftName.trim()) return;
    setSaveState("saving");
    const timer = window.setTimeout(() => {
      const d: Draft = {
        id: draftId,
        name: draftName,
        form,
        myVoice: draftMyVoice,
        updatedAt: new Date().toISOString(),
      };
      lastSaved.current = snap;
      saveDraft(userId, d, ownerId).then((where) => {
        setSaveState(userId && where === "device" && store === "account" ? "failed" : "saved");
        setDrafts((prev) => [d, ...prev.filter((x) => x.id !== d.id)]);
      });
    }, 700);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, draftName, draftMyVoice, loaded, practice]);

  // Rename any draft from the grid. The open one is renamed through its name
  // box so the autosave picks it up; others are saved straight away.
  function renameDraft(d: Draft) {
    const name = window.prompt("Name this draft:", draftLabel(d));
    if (name === null) return;
    if (d.id === draftId) {
      setDraftName(name.trim());
      return;
    }
    const renamed = { ...d, name: name.trim(), updatedAt: new Date().toISOString() };
    setDrafts((prev) => [renamed, ...prev.filter((x) => x.id !== d.id)]);
    saveDraft(userId, renamed, ownerId);
  }

  /** "Save to my drafts" at the end of the form: name it and save now. */
  async function saveToDrafts(name: string): Promise<DraftStore> {
    const d: Draft = {
      id: draftId,
      name,
      form,
      myVoice: draftMyVoice,
      updatedAt: new Date().toISOString(),
    };
    setDraftName(name);
    lastSaved.current = snapshot(name, form, draftMyVoice);
    const where = await saveDraft(userId, d, ownerId);
    setDrafts((prev) => [d, ...prev.filter((x) => x.id !== d.id)]);
    setSaveState(userId && where === "device" && store === "account" ? "failed" : "saved");
    return where;
  }

  function startNewDraft() {
    openDraft(newDraft());
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function removeDraft(d: Draft) {
    if (!window.confirm(`Delete the draft "${draftLabel(d)}"? This can't be undone.`)) return;
    await deleteDraft(userId, d.id);
    const rest = drafts.filter((x) => x.id !== d.id);
    setDrafts(rest);
    if (d.id === draftId) openDraft(rest[0] ?? newDraft());
  }

  function reuseEntry(entry: HistoryEntry) {
    // A new draft, so whatever is open now is kept as it is. Fresh ids, so
    // the copy and the history entry never share list keys.
    openDraft(newDraft({ myVoice: null }));
    setForm({
      ...entry.form,
      symptoms: entry.form.symptoms.map((x) => ({ ...x, id: newId() })),
      medications: entry.form.medications.map((x) => ({ ...x, id: newId() })),
      ruledOut: entry.form.ruledOut.map((x) => ({ ...x, id: newId() })),
      questions: entry.form.questions.map((x) => ({ ...x, id: newId() })),
      timeline: entry.form.timeline
        ? {
            ...entry.form.timeline,
            entries: entry.form.timeline.entries.map((x) => ({ ...x, id: newId() })),
          }
        : emptyTimeline(),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function deleteEntry(entry: HistoryEntry) {
    if (!window.confirm(`Delete "${historyTitle(entry.form)}" from your history?`)) return;
    setHistory(removeFromHistory(entry.id));
  }

  if (viewing) {
    return (
      <SummaryView
        form={viewing.form}
        checkIns={entryCheckIns(viewing)}
        calendar={calendarPageFor(viewing.form)}
        date={viewing.savedAt}
        backLabel="← Back to your history"
        onBack={() => {
          setViewing(null);
          requestAnimationFrame(() =>
            document.getElementById("history")?.scrollIntoView({ block: "start" })
          );
        }}
      />
    );
  }

  if (showSummary) {
    return (
      <SummaryView
        form={form}
        checkIns={pickedCheckIns}
        calendar={calendarPageFor(form)}
        onBack={() => setShowSummary(false)}
      />
    );
  }

  return (
    <div className="btd-container py-10 max-w-2xl">
      <ForLabel className="mb-3" />
      <NeedsChild what="Appointment Prep" />
      <h1 className="text-3xl font-display font-semibold mb-2">
        {inkLastWord(self ? "Get ready for my visit" : parentFor ? `Appointment Prep for ${parentFor}` : "Appointment Prep Tool")}
      </h1>
      <p className="text-slate mb-6">
        Fill this in before the visit. You'll get a one-page summary to bring to the doctor.
      </p>
      <DraftsPanel
        practice={practice}
        signedIn={Boolean(user)}
        store={store}
        accountMissing={accountMissing}
        saveState={saveState}
        loaded={loaded}
        name={draftName}
        onNameChange={setDraftName}
        placeholder={form.patientName.trim() || "Untitled draft"}
        current={drafts.find((d) => d.id === draftId)}
        drafts={drafts}
        currentId={draftId}
        onOpen={openDraft}
        onNew={startNewDraft}
        onRename={renameDraft}
        onDelete={removeDraft}
      />

      <BroughtIn
        parentFor={parentFor}
        calendarLabel={calendarLabel}
        aboutMe={form.aboutMe}
        boardReady={meBoardLoaded}
        boardHasNotes={boardHasContent(meBoard)}
        onBoardUpdate={() => setForm((f) => ({ ...f, aboutMe: { ...copyBoard(meBoard), off: f.aboutMe?.off ?? [] } }))}
        checkInsLoaded={checkInsLoaded}
        checkInCount={checkIns.length}
        pickedCount={pickedCheckIns.length}
        calendarCount={form.calendarPage?.entryIds.length ?? 0}
        onShowAboutMe={() => {
          setMoreOpen(true);
          requestAnimationFrame(() =>
            document.getElementById("about-me")?.scrollIntoView({ behavior: "smooth", block: "start" })
          );
        }}
        onCalendar={() => {
          setImportNote(null);
          setImporting(true);
          document.getElementById("calendar-import")?.scrollIntoView({ behavior: "smooth", block: "start" });
        }}
      />

      {/* Opened from the Calendar row above. */}
      <div id="calendar-import" className="mb-8 grid scroll-mt-28 gap-3 empty:hidden">
        {importing && family.children.length > 0 && mode !== "parent" && (
          <div role="group" aria-label="Whose calendar?" className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate">Whose calendar?</span>
            {[{ id: null as string | null, name: "Mine" }, ...family.children.map((c) => ({ id: c.personId as string | null, name: c.name }))].map(
              (o) => (
                <button
                  key={o.id ?? "mine"}
                  type="button"
                  aria-pressed={importFrom === o.id}
                  onClick={() => setImportFrom(o.id)}
                  className={`min-h-[40px] rounded-full border px-4 py-2 text-sm ${
                    importFrom === o.id ? "border-navy bg-navy font-bold text-mist" : "border-navy/15 bg-white font-medium text-navy"
                  }`}
                >
                  {o.name}
                </button>
              )
            )}
          </div>
        )}
        {importing && (!calLoaded || (importFrom && !childCals[importFrom])) ? (
          <p className="text-sm text-slate">Loading the calendar…</p>
        ) : importing ? (
          <CalendarImport
            key={importFrom ?? "mine"}
            entries={importFrom ? childCals[importFrom].entries : calEntries}
            customs={importFrom ? childCals[importFrom].customs : calCustoms}
            lastVisit={history[0]?.savedAt ?? null}
            alreadyIn={importedIds}
            onImport={importFromCalendar}
            onClose={() => setImporting(false)}
            whose={calendarLabel}
          />
        ) : null}
        {importNote && (
          <p role="status" className="rounded-tile border border-sky bg-sky-tint px-4 py-3 text-sm text-navy">
            {importNote}
          </p>
        )}
        {form.calendarPage && (
          <label className="flex items-center gap-2 text-sm font-medium text-ink">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={form.calendarPage.include}
              onChange={(e) =>
                setForm((f) => ({ ...f, calendarPage: f.calendarPage && { ...f.calendarPage, include: e.target.checked } }))
              }
            />
            Add a page "From my symptom calendar" to the PDF
          </label>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!practice && !formIsEmpty(form)) setHistory(addToHistory(form, pickedCheckIns));
          setShowSummary(true);
        }}
        className="space-y-10"
      >
        <section aria-labelledby="step-1" className="space-y-5">
          <StepHeading step={1} id="step-1">Who and why</StepHeading>
          <Field label={self ? "My name" : parentFor ? "Who this visit is for" : "Patient name"}>
            <input
              className="btd-input"
              value={form.patientName}
              onChange={(e) => setForm({ ...form, patientName: e.target.value })}
              placeholder="Who is this visit for?"
            />
          </Field>

          <Field label={self ? "Why I'm going" : parentFor ? `Why ${parentFor} is going` : "Reason for visit"}>
            <textarea
              className="btd-input min-h-[80px]"
              value={form.reasonForVisit}
              onChange={(e) => setForm({ ...form, reasonForVisit: e.target.value })}
              placeholder="One or two sentences on why you're coming in"
            />
            <DictateButton
              value={form.reasonForVisit}
              onChange={(v) => setForm((f) => ({ ...f, reasonForVisit: v }))}
              label="Reason for visit"
            />
          </Field>
        </section>

        <ListSection
          step={2}
          label={whose("symptoms", "Symptoms")}
          addLabel="+ Add another symptom"
          onAdd={() => addItem("symptoms", emptySymptom)}
        >
          {form.symptoms.map((s, i) => (
            <EntryCard
              key={s.id}
              index={i}
              label="Symptom"
              onRemove={form.symptoms.length > 1 ? () => removeItem("symptoms", s.id) : undefined}
            >
              <input
                className="btd-input"
                placeholder="Describe the symptom"
                value={s.description}
                onChange={(e) => updateItem("symptoms", s.id, { description: e.target.value })}
              />
              <div className="grid sm:grid-cols-2 gap-3">
                <input
                  className="btd-input"
                  placeholder="When did it start? (onset / duration)"
                  value={s.onset}
                  onChange={(e) => updateItem("symptoms", s.id, { onset: e.target.value })}
                />
                <select
                  className="btd-input"
                  aria-label="New or usual"
                  value={s.baselineOrNew}
                  onChange={(e) =>
                    updateItem("symptoms", s.id, {
                      baselineOrNew: e.target.value as Symptom["baselineOrNew"],
                    })
                  }
                >
                  <option value="new">New — not typical for this person</option>
                  <option value="baseline">Baseline — part of how they usually are</option>
                </select>
              </div>
              <SymptomDetails symptom={s}>
                <select
                  className="btd-input"
                  aria-label="Where on the body"
                  value={s.area ?? ""}
                  onChange={(e) => updateItem("symptoms", s.id, { area: e.target.value || undefined })}
                >
                  <option value="">Where on the body? (optional)</option>
                  {SYMPTOM_AREAS.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
                <input
                  className="btd-input"
                  aria-label="Pattern"
                  placeholder="Pattern (e.g. most mornings)"
                  value={s.pattern ?? ""}
                  onChange={(e) => updateItem("symptoms", s.id, { pattern: e.target.value || undefined })}
                />
                <select
                  className="btd-input"
                  aria-label="Reported by"
                  value={s.reportedBy ?? ""}
                  onChange={(e) =>
                    updateItem("symptoms", s.id, { reportedBy: (e.target.value || undefined) as Symptom["reportedBy"] })
                  }
                >
                  <option value="">Reported by? (optional)</option>
                  {SYMPTOM_REPORTERS.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))}
                </select>
                <select
                  className="btd-input sm:col-span-2"
                  aria-label="Getting stronger, the same, or better"
                  value={s.trajectory ?? ""}
                  onChange={(e) =>
                    updateItem("symptoms", s.id, { trajectory: (e.target.value || undefined) as Symptom["trajectory"] })
                  }
                >
                  <option value="">Getting stronger, the same, or better? (optional)</option>
                  {SYMPTOM_TRAJECTORIES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
                <textarea
                  className="btd-input sm:col-span-2 min-h-[60px]"
                  aria-label="Notes"
                  placeholder="Notes (optional)"
                  value={s.notes ?? ""}
                  onChange={(e) => updateItem("symptoms", s.id, { notes: e.target.value || undefined })}
                />
              </SymptomDetails>
              {s.calendar && (
                <p className="flex flex-wrap items-center gap-2 text-xs text-slate">
                  <Icon name="calendar" size={14} />
                  From the calendar · {s.calendar.entryIds.length}{" "}
                  {s.calendar.entryIds.length === 1 ? "entry" : "entries"} · not sent to Refine with AI
                  {s.calendar.entryIds.length > 1 && (
                    <button
                      type="button"
                      onClick={() => splitSymptom(s)}
                      className="font-semibold text-link hover:underline"
                    >
                      Un-merge
                    </button>
                  )}
                </p>
              )}
            </EntryCard>
          ))}
        </ListSection>

        <div id="my-voice" className="scroll-mt-28">
          <MyVoiceSection
            checkIns={checkIns}
            loaded={checkInsLoaded}
            pickedIds={pickedIds}
            onToggle={togglePicked}
            onAdded={(id) => setPicked([...pickedIds.filter((x) => x !== id), id])}
          />
        </div>

        <ListSection
          step={3}
          label={whose("medications", "Current medications")}
          addLabel="+ Add another medication"
          onAdd={() => addItem("medications", emptyMedication)}
        >
          {form.medications.map((m, i) => (
            <EntryCard
              key={m.id}
              index={i}
              label="Medication"
              onRemove={
                form.medications.length > 1 ? () => removeItem("medications", m.id) : undefined
              }
            >
              <input
                className="btd-input"
                placeholder="Medication name"
                value={m.name}
                onChange={(e) => updateItem("medications", m.id, { name: e.target.value })}
              />
              <div className="grid sm:grid-cols-2 gap-3">
                <input
                  className="btd-input"
                  placeholder="Dose (e.g. 10 mg)"
                  value={m.dose}
                  onChange={(e) => updateItem("medications", m.id, { dose: e.target.value })}
                />
                <input
                  className="btd-input"
                  placeholder="How often (e.g. twice a day)"
                  value={m.frequency}
                  onChange={(e) => updateItem("medications", m.id, { frequency: e.target.value })}
                />
              </div>
            </EntryCard>
          ))}
        </ListSection>

        <ListSection
          step={4}
          label={self ? "My questions for the doctor" : "Prioritized questions"}
          addLabel="+ Add another question"
          onAdd={() => addItem("questions", emptyQuestion)}
        >
          {form.questions.map((q, i) => (
            <div key={q.id} className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-light w-5 shrink-0">{i + 1}.</span>
              <input
                className="btd-input"
                placeholder="A single question you want answered"
                value={q.text}
                onChange={(e) => updateItem("questions", q.id, { text: e.target.value })}
              />
              {form.questions.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeItem("questions", q.id)}
                  className="text-xs text-clay hover:underline shrink-0"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </ListSection>

        <MoreToAdd open={moreOpen} onToggle={() => setMoreOpen((v) => !v)} summary={moreSummary}>
          <AboutMeSection
            title={parentFor ? `About ${parentFor} (from the Me board)` : "About me (from my Me page)"}
            parentFor={parentFor}
            copy={form.aboutMe}
            boardReady={meBoardLoaded}
            boardHasNotes={boardHasContent(meBoard)}
            onToggle={(id) =>
              setForm((f) =>
                f.aboutMe
                  ? {
                      ...f,
                      aboutMe: {
                        ...f.aboutMe,
                        off: f.aboutMe.off.includes(id) ? f.aboutMe.off.filter((x) => x !== id) : [...f.aboutMe.off, id],
                      },
                    }
                  : f
              )
            }
            onUpdate={() => setForm((f) => ({ ...f, aboutMe: { ...copyBoard(meBoard), off: f.aboutMe?.off ?? [] } }))}
          />

          <SymptomTimeline
            value={timeline}
            onChange={(t: Timeline) => setForm((f) => ({ ...f, timeline: t }))}
          />

          <ListSection
            label="Already ruled out"
            addLabel="+ Add another"
            onAdd={() => addItem("ruledOut", emptyRuledOut)}
          >
            {form.ruledOut.map((r, i) => (
              <EntryCard
                key={r.id}
                index={i}
                label="Ruled out"
                onRemove={form.ruledOut.length > 1 ? () => removeItem("ruledOut", r.id) : undefined}
              >
                <input
                  className="btd-input"
                  placeholder="Test, condition, or explanation already checked"
                  value={r.description}
                  onChange={(e) => updateItem("ruledOut", r.id, { description: e.target.value })}
                />
                <input
                  className="btd-input"
                  placeholder="When was it checked? (optional)"
                  value={r.when}
                  onChange={(e) => updateItem("ruledOut", r.id, { when: e.target.value })}
                />
              </EntryCard>
            ))}
          </ListSection>

          <Field label="Communication or accommodation needs">
            <textarea
              className="btd-input min-h-[70px]"
              value={form.accommodations}
              onChange={(e) => setForm({ ...form, accommodations: e.target.value })}
              placeholder="e.g. extra time to answer, picture-based options, speak directly to the patient first"
            />
            <DictateButton
              value={form.accommodations}
              onChange={(v) => setForm((f) => ({ ...f, accommodations: v }))}
              label="Communication or accommodation needs"
            />
          </Field>
        </MoreToAdd>

        {refineError && (
          <p className="text-sm text-clay bg-clay/10 border border-clay/30 rounded px-4 py-3">
            {refineError}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            className="btd-btn btd-accent min-h-[52px] bg-navy px-7 text-base text-mist hover:bg-navy/90"
          >
            Generate summary
          </button>
          <button
            type="button"
            onClick={handleRefine}
            disabled={refining}
            className="btd-btn-outline min-h-[44px] gap-2 px-5 text-sm disabled:opacity-50"
          >
            <Icon name="refine" size={18} />
            {refining ? "Refining…" : "Refine with AI"}
          </button>
          <SaveToDrafts
            practice={practice}
            empty={formIsEmpty(form)}
            suggestedName={
              draftName.trim() ||
              `${form.patientName.trim() || "Visit"} – ${new Date().toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })}`
            }
            onSave={saveToDrafts}
          />
        </div>
      </form>

      <HistorySection
        entries={history}
        startOpen={hash === "#history"}
        onView={setViewing}
        onReuse={reuseEntry}
        onDelete={deleteEntry}
      />
    </div>
  );
}

function HistorySection({
  entries,
  startOpen,
  onView,
  onReuse,
  onDelete,
}: {
  entries: HistoryEntry[];
  /** Linked to directly (/appointment-prep#history): show every one. */
  startOpen: boolean;
  onView: (entry: HistoryEntry) => void;
  onReuse: (entry: HistoryEntry) => void;
  onDelete: (entry: HistoryEntry) => void;
}) {
  const [showAll, setShowAll] = useState(startOpen);
  const shown = showAll ? entries : entries.slice(0, 3);
  return (
    <section id="history" className="mt-14 scroll-mt-24">
      <h2 className="text-23 font-extrabold text-navy">Appointment history</h2>
      <p className="mt-1.5 text-sm text-slate">
        Every summary you generate is kept here, on this device, newest first. Open one to
        see or print it again, or use it as the starting point for your next visit.
      </p>

      {entries.length === 0 ? (
        <p className="mt-4 rounded-tile border border-dashed border-navy/20 bg-mist p-4 text-sm text-slate">
          Nothing yet. When you press "Generate summary", a copy is saved here.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {shown.map((entry) => (
            <li key={entry.id} className="btd-card p-4">
              <p className="text-xs uppercase tracking-wide text-slate-light font-semibold">
                {new Date(entry.savedAt).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
              <p className="mt-1 font-semibold text-ink break-words">{historyTitle(entry.form)}</p>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                <button
                  type="button"
                  onClick={() => onView(entry)}
                  className="px-3 py-1.5 rounded bg-ink text-paper font-semibold"
                >
                  Open summary
                </button>
                <button
                  type="button"
                  onClick={() => onReuse(entry)}
                  className="font-semibold text-gold-dark hover:underline"
                >
                  Use as starting point
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(entry)}
                  className="text-xs text-clay hover:underline sm:ml-auto"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {entries.length > 3 && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="mt-3 min-h-[36px] text-sm font-semibold text-link hover:underline"
        >
          {showAll ? "Show fewer" : `Show all ${entries.length}`}
        </button>
      )}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block font-semibold text-sm text-ink mb-2">{label}</label>
      {children}
    </div>
  );
}

function EntryCard({
  index,
  label,
  onRemove,
  children,
}: {
  index: number;
  label: string;
  onRemove?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="btd-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wide text-slate-light font-semibold">
          {label} {index + 1}
        </span>
        {onRemove && (
          <button type="button" onClick={onRemove} className="text-xs text-clay hover:underline">
            Remove
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function ListSection({
  step,
  label,
  addLabel,
  onAdd,
  children,
}: {
  /** One of the four main steps: a numbered heading. */
  step?: number;
  label: string;
  addLabel: string;
  onAdd: () => void;
  children: React.ReactNode;
}) {
  const addButton = (
    <button type="button" onClick={onAdd} className="min-h-[36px] text-sm font-semibold text-link hover:underline">
      {addLabel}
    </button>
  );
  if (step) {
    const id = `step-${step}`;
    return (
      <section aria-labelledby={id} className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <StepHeading step={step} id={id}>
            {label}
          </StepHeading>
          {addButton}
        </div>
        {children}
      </section>
    );
  }
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold text-sm text-ink">{label}</span>
        {addButton}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function StepHeading({ step, id, children }: { step: number; id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="flex items-center gap-3 text-21 font-extrabold text-navy">
      <span aria-hidden="true" className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-sky-tint text-15 text-navy">
        {step}
      </span>
      {children}
    </h2>
  );
}

/** The extra symptom fields, folded until wanted (or already filled in). */
function SymptomDetails({ symptom: s, children }: { symptom: Symptom; children: React.ReactNode }) {
  const [open, setOpen] = useState(
    () => Boolean(s.area || s.pattern || s.reportedBy || s.trajectory || s.notes)
  );
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="min-h-[36px] text-sm font-semibold text-link hover:underline"
      >
        {open ? "Hide extra detail" : "+ Add more detail"}
      </button>
      {/* Hidden by class, not the hidden attribute: "grid" would override it. */}
      <div className={`mt-2 gap-3 sm:grid-cols-2 ${open ? "grid" : "hidden"}`}>
        {children}
      </div>
    </div>
  );
}

/** Everything optional, in one fold-out. Hidden rather than removed when
 *  closed, so a check-in or timeline in progress isn't lost. */
function MoreToAdd({
  open,
  onToggle,
  summary,
  children,
}: {
  open: boolean;
  onToggle: () => void;
  summary: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby="more-heading" className="rounded-card border border-navy/12 bg-white">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls="more-to-add"
        className="flex min-h-[64px] w-full items-center justify-between gap-3 rounded-card px-5 py-4 text-left hover:bg-sky/10"
      >
        <span>
          <span id="more-heading" className="block text-17 font-extrabold text-navy">
            More you can add (optional)
          </span>
          <span className="mt-0.5 block text-13 text-body">{summary}</span>
        </span>
        <Icon
          name="chevron-right"
          size={20}
          className={`shrink-0 text-navy transition-transform ${open ? "-rotate-90" : "rotate-90"}`}
        />
      </button>
      <div id="more-to-add" className={`space-y-8 border-t border-navy/10 px-5 pb-6 pt-5 ${open ? "block" : "hidden"}`}>
        {children}
      </div>
    </section>
  );
}

// ---- Drafts ----

function DraftsPanel({
  practice,
  signedIn,
  store,
  accountMissing,
  saveState,
  loaded,
  name,
  onNameChange,
  placeholder,
  current,
  drafts,
  currentId,
  onOpen,
  onNew,
  onRename,
  onDelete,
}: {
  practice: boolean;
  signedIn: boolean;
  store: DraftStore;
  accountMissing: boolean;
  saveState: "idle" | "saving" | "saved" | "failed";
  loaded: boolean;
  name: string;
  onNameChange: (name: string) => void;
  placeholder: string;
  current: Draft | undefined;
  drafts: Draft[];
  currentId: string;
  onOpen: (d: Draft) => void;
  onNew: () => void;
  onRename: (d: Draft) => void;
  onDelete: (d: Draft) => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const shown = showAll ? drafts : drafts.slice(0, 6);

  let where: string;
  if (practice) {
    where = "Practice mode: nothing here is saved.";
  } else if (store === "account") {
    where = "Saves to your account as you type.";
  } else if (signedIn && accountMissing) {
    where = "Saves on this device as you type.";
  } else {
    where = "Saves on this device as you type, never uploaded.";
  }

  const status = practice
    ? null
    : !loaded
    ? "Loading your drafts…"
    : saveState === "saving"
    ? "Saving…"
    : saveState === "failed"
    ? "Couldn't reach your account — kept on this device for now."
    : saveState === "saved"
    ? store === "account"
      ? "Saved to your account"
      : "Saved on this device"
    : null;

  return (
    // One slim line: the name, a new draft, and the list when wanted.
    <section aria-labelledby="drafts-heading" className="mb-10 rounded-tile border border-navy/12 bg-white px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <label id="drafts-heading" htmlFor="draft-name" className="text-sm font-bold text-navy">
          Draft
        </label>
        <input
          id="draft-name"
          className="btd-input min-h-[40px] min-w-0 flex-1 basis-[160px]"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder={placeholder}
          aria-describedby="draft-where"
        />
        <button type="button" onClick={onNew} className="btd-btn-sky min-h-[40px] px-4 text-sm">
          + New draft
        </button>
        {drafts.length > 0 && (
          <button
            type="button"
            onClick={() => setListOpen((v) => !v)}
            aria-expanded={listOpen}
            aria-controls="drafts-grid"
            className="inline-flex min-h-[40px] items-center gap-1 text-sm font-bold text-navy hover:text-link"
          >
            My drafts ({drafts.length})
            <Icon
              name="chevron-right"
              size={16}
              className={`transition-transform ${listOpen ? "-rotate-90" : "rotate-90"}`}
            />
          </button>
        )}
        {current && (
          <button
            type="button"
            onClick={() => onDelete(current)}
            className="min-h-[40px] text-sm font-semibold text-clay hover:underline"
          >
            Delete
          </button>
        )}
      </div>

      <p id="draft-where" className="mt-1.5 text-12 text-muted">
        {where}
        {status && (
          <span className="ml-1 font-semibold text-navy" aria-live="polite">
            {status}
          </span>
        )}
      </p>

      {listOpen && drafts.length > 0 && (
        <div className="mt-3 border-t border-navy/[0.08] pt-3">
          <ul id="drafts-grid" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {shown.map((d) => (
              <DraftCard
                key={d.id}
                draft={d}
                open={d.id === currentId}
                onOpen={() => {
                  onOpen(d);
                  setListOpen(false);
                }}
                onRename={() => onRename(d)}
                onDelete={() => onDelete(d)}
              />
            ))}
          </ul>
          {drafts.length > 6 && (
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="mt-3 text-sm font-semibold text-link hover:underline"
            >
              {showAll ? "Show fewer" : `Show all ${drafts.length} drafts`}
            </button>
          )}
        </div>
      )}
    </section>
  );
}

/** One draft as a card, like a file in Google Drive: a small preview of the
 *  page on top, then its name, when it last changed, and a ⋯ menu. */
function DraftCard({
  draft,
  open,
  onOpen,
  onRename,
  onDelete,
}: {
  draft: Draft;
  open: boolean;
  onOpen: () => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  const [menu, setMenu] = useState(false);
  const f = draft.form;
  const symptoms = f.symptoms.filter((s) => s.description.trim());
  const questions = f.questions.filter((q) => q.text.trim());

  return (
    <li
      className={`relative flex flex-col overflow-hidden rounded-tile border bg-white transition-shadow hover:shadow-md ${
        open ? "border-link ring-2 ring-link/30" : "border-navy/16"
      }`}
    >
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Open ${draftLabel(draft)}`}
        aria-current={open ? "true" : undefined}
        className="block h-28 overflow-hidden border-b border-navy/10 bg-mist px-3 pt-3 text-left"
      >
        <div className="h-full rounded-t-sm bg-white px-2.5 pt-2 text-[7px] leading-[1.45] text-slate shadow-sm">
          <p className="truncate text-[8px] font-bold text-navy">{f.patientName.trim() || "Visit summary"}</p>
          {f.reasonForVisit.trim() && <p className="line-clamp-2">{f.reasonForVisit}</p>}
          {symptoms.slice(0, 3).map((s) => (
            <p key={s.id} className="truncate">• {s.description}</p>
          ))}
          {questions.slice(0, 2).map((q) => (
            <p key={q.id} className="truncate">? {q.text}</p>
          ))}
          {!f.reasonForVisit.trim() && symptoms.length === 0 && questions.length === 0 && (
            <p className="text-muted">Nothing filled in yet</p>
          )}
        </div>
      </button>
      <div className="flex items-start gap-2 px-3 py-2.5">
        <span aria-hidden className="mt-0.5 inline-block h-4 w-3.5 shrink-0 rounded-[2px] bg-link">
          <span className="mx-auto mt-1 block h-[1.5px] w-2 bg-white" />
          <span className="mx-auto mt-[2px] block h-[1.5px] w-2 bg-white" />
        </span>
        <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
          <p className="truncate text-sm font-semibold text-navy" title={draftLabel(draft)}>
            {draftLabel(draft)}
          </p>
          <p className="text-12 text-muted">
            {open ? "Open now" : `Changed ${shortDate(draft.updatedAt)}`}
          </p>
        </button>
        <button
          type="button"
          onClick={() => setMenu((v) => !v)}
          aria-expanded={menu}
          aria-label={`Options for ${draftLabel(draft)}`}
          className="-mr-1 shrink-0 rounded-full px-1.5 text-lg leading-none text-body hover:bg-mist"
        >
          ⋮
        </button>
      </div>
      {menu && (
        <div className="absolute right-2 bottom-12 z-10 grid min-w-[120px] rounded-tile border border-navy/16 bg-white py-1 text-sm shadow-lg">
          {[
            ["Open", onOpen],
            ["Rename", onRename],
            ["Delete", onDelete],
          ].map(([label, action]) => (
            <button
              key={label as string}
              type="button"
              onClick={() => {
                setMenu(false);
                (action as () => void)();
              }}
              className={`px-3 py-1.5 text-left hover:bg-mist ${label === "Delete" ? "text-clay" : "text-navy"}`}
            >
              {label as string}
            </button>
          ))}
        </div>
      )}
    </li>
  );
}

/** The last step of the form: give the draft a name and save it. */
function SaveToDrafts({
  practice,
  empty,
  suggestedName,
  onSave,
}: {
  practice: boolean;
  empty: boolean;
  suggestedName: string;
  onSave: (name: string) => Promise<DraftStore>;
}) {
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  if (practice) return null;

  async function save() {
    const final = name.trim() || suggestedName;
    setSaving(true);
    const where = await onSave(final);
    setSaving(false);
    setNaming(false);
    setDone(
      `Saved to your drafts as "${final}"${where === "account" ? " — it's in your account." : " on this device."}`
    );
  }

  return (
    <>
      {!naming ? (
        <button
          type="button"
          disabled={empty}
          title={empty ? "Fill in the form first, then save it." : undefined}
          onClick={() => {
            setName(suggestedName);
            setDone(null);
            setNaming(true);
          }}
          className="btd-btn-sky min-h-[44px] px-5 text-sm disabled:opacity-40"
        >
          Save to my drafts
        </button>
      ) : (
        <div className="basis-full">
          <label htmlFor="save-draft-name" className="block text-sm font-bold text-navy">
            Name this draft
          </label>
          <div className="mt-1.5 flex flex-wrap gap-2">
            <input
              id="save-draft-name"
              className="btd-input min-w-0 flex-1"
              value={name}
              autoFocus
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  save();
                }
              }}
              placeholder={suggestedName}
            />
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="btd-btn-sky min-h-[44px] px-5 text-sm disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => setNaming(false)}
              className="min-h-[44px] px-3 text-sm text-slate hover:underline"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {done && (
        <p role="status" className="basis-full text-sm text-slate">
          {done}
        </p>
      )}
    </>
  );
}

function MyVoiceSection({
  checkIns,
  loaded,
  pickedIds,
  onToggle,
  onAdded,
}: {
  checkIns: CheckIn[];
  loaded: boolean;
  pickedIds: string[];
  onToggle: (id: string) => void;
  /** A check-in made right here was saved; tick it. */
  onAdded: (id: string) => void;
}) {
  const [showAll, setShowAll] = useState(false);
  // A new check-in being made right here, without leaving the form.
  const [adding, setAdding] = useState<CheckIn | null>(null);
  const { readingLevel } = useMyVoice();

  if (!loaded) return null;

  const addButton = (
    <button
      type="button"
      onClick={() => setAdding(emptyCheckIn())}
      className="btd-btn-sky mt-3 min-h-[46px] gap-2 px-5 py-3 text-sm"
    >
      <Icon name="hub-feelings" size={18} />+ Add a My Voice check-in
    </button>
  );

  if (adding) {
    return (
      <div className="rounded-tile border-2 border-sky bg-sky-tint p-4">
        <p className="mb-4 text-sm font-semibold text-ink">
          New My Voice check-in · it's saved to My check-ins and put on this summary
        </p>
        <CheckInFlow
          key={adding.id}
          initial={adding}
          readingLevel={readingLevel}
          embedded={{
            onSaved: (c) => {
              setAdding(null);
              onAdded(c.id);
            },
            onCancel: () => setAdding(null),
          }}
        />
      </div>
    );
  }

  if (!checkIns.length) {
    return (
      <div className="rounded-tile border border-dashed border-navy/20 bg-mist p-4">
        <p className="text-sm font-semibold text-ink">In their own words</p>
        <p className="mt-1 text-sm text-slate">
          No check-ins from My Voice yet. The person this visit is for can check in right
          here, and what they say is printed on this summary — in their words, not yours.
        </p>
        {addButton}
      </div>
    );
  }

  // The newest few, plus any older ones already ticked.
  const shown = showAll
    ? checkIns
    : checkIns.filter((c, i) => i < 5 || pickedIds.includes(c.id));
  return (
    <div className="rounded-tile border-2 border-sky bg-sky-tint p-4">
      <p className="text-sm font-semibold text-ink">In their own words (from My Voice)</p>
      <p className="text-xs text-slate-light">
        Tick each check-in to put on the summary. The newest is ticked to start.
      </p>
      {checkIns.filter((c) => c.overall).length >= 2 && (
        <div className="mt-3 rounded-tile bg-white p-3">
          <p className="mb-2 text-xs font-semibold text-slate">How they've felt, oldest first</p>
          <FeelingsOverTime checkIns={checkIns} />
        </div>
      )}
      <ul className="mt-3 space-y-2">
        {shown.map((c) => (
          <li key={c.id}>
            <label className="flex cursor-pointer items-start gap-3 rounded-tile border border-navy/10 bg-white p-3">
              <input
                type="checkbox"
                checked={pickedIds.includes(c.id)}
                onChange={() => onToggle(c.id)}
                className="mt-1 h-4 w-4 shrink-0"
              />
              <CheckInSummary checkIn={c} />
            </label>
          </li>
        ))}
      </ul>
      {shown.length < checkIns.length && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="mt-3 text-sm font-semibold text-link hover:underline"
        >
          Show all {checkIns.length} check-ins
        </button>
      )}
      {addButton}
      <Link to="/my-voice" className="mt-3 block text-sm font-semibold text-link hover:underline">
        Change or delete check-ins in My Voice →
      </Link>
    </div>
  );
}

/** At the top of the form: what's come in from the Me board, My Voice and
 *  the calendar, with one button each to bring it in or go and look. So
 *  nobody has to hunt down the page to check it's all there. */
function BroughtIn({
  parentFor,
  calendarLabel,
  aboutMe,
  boardReady,
  boardHasNotes,
  onBoardUpdate,
  checkInsLoaded,
  checkInCount,
  pickedCount,
  calendarCount,
  onShowAboutMe,
  onCalendar,
}: {
  parentFor: string | null;
  calendarLabel: string;
  aboutMe: AboutMeCopy | undefined;
  boardReady: boolean;
  boardHasNotes: boolean;
  onBoardUpdate: () => void;
  checkInsLoaded: boolean;
  checkInCount: number;
  pickedCount: number;
  calendarCount: number;
  /** About me sits in the fold-out: open it, then go there. */
  onShowAboutMe: () => void;
  onCalendar: () => void;
}) {
  const notes = aboutMe?.notes.filter((n) => n.lines.length && !aboutMe.off.includes(n.id)).length ?? 0;
  const board = parentFor ? "the Me board" : "my Me page";
  const go = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

  const rows: { icon: "person" | "hub-feelings" | "calendar"; title: string; status: string; done: boolean; action: React.ReactNode }[] = [
    {
      icon: "person",
      title: parentFor ? "Me board" : "About me",
      done: notes > 0,
      status: notes
        ? `${plural(notes, "note")} from ${board}, first on the summary.`
        : boardReady && boardHasNotes
          ? `${board[0].toUpperCase()}${board.slice(1)} has notes that aren't on this draft yet.`
          : `Nothing on ${board} yet.`,
      action: notes ? (
        <button type="button" onClick={onShowAboutMe} className="font-semibold text-link hover:underline">
          See them
        </button>
      ) : boardReady && boardHasNotes ? (
        <button type="button" onClick={onBoardUpdate} className="font-semibold text-link hover:underline">
          Bring them in
        </button>
      ) : (
        <Link to="/me" className="font-semibold text-link hover:underline">
          Fill it in
        </Link>
      ),
    },
    {
      icon: "hub-feelings",
      title: "My Voice check-ins",
      done: pickedCount > 0,
      status: !checkInsLoaded
        ? "Loading…"
        : pickedCount
          ? `${plural(pickedCount, "check-in")} on the summary, in their own words.`
          : checkInCount
            ? `${plural(checkInCount, "check-in")} saved, none picked for this visit.`
            : "No check-ins yet. You can add one below.",
      action: (
        <button type="button" onClick={() => go("my-voice")} className="font-semibold text-link hover:underline">
          {checkInCount ? "Choose" : "Add one"}
        </button>
      ),
    },
    {
      icon: "calendar",
      title: "Calendar",
      done: calendarCount > 0,
      status: calendarCount
        ? `${plural(calendarCount, "entry", "entries")} brought in from ${calendarLabel}.`
        : `Nothing from ${calendarLabel} yet.`,
      action: (
        <button type="button" onClick={onCalendar} className="font-semibold text-link hover:underline">
          {calendarCount ? "Bring in more" : "Bring it in"}
        </button>
      ),
    },
  ];

  return (
    <section aria-labelledby="brought-in-heading" className="btd-card mb-6 p-5">
      <h2 id="brought-in-heading" className="text-17 font-extrabold text-navy">
        What's coming into this visit
      </h2>
      <ul className="mt-3 grid gap-2">
        {rows.map((r) => (
          <li key={r.title} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-tile bg-mist px-3 py-2.5">
            <span
              className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${r.done ? "bg-navy text-mist" : "bg-white text-navy"}`}
            >
              <Icon name={r.done ? "check" : r.icon} size={16} />
            </span>
            <span className="min-w-0 flex-1 basis-[220px] text-sm text-ink">
              <strong className="font-semibold">{r.title}:</strong> {r.status}
            </span>
            <span className="text-sm">{r.action}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** "About me (from my Me page)": this draft's copy of the Me board. Each
 *  note can be left off this draft; the board itself is never changed here. */
function AboutMeSection({
  title,
  parentFor,
  copy,
  boardReady,
  boardHasNotes,
  onToggle,
  onUpdate,
}: {
  title: string;
  /** A parent's name for the person, so the wording is about them. */
  parentFor: string | null;
  copy: AboutMeCopy | undefined;
  boardReady: boolean;
  boardHasNotes: boolean;
  onToggle: (id: NoteId) => void;
  onUpdate: () => void;
}) {
  const notes = copy?.notes.filter((n) => n.lines.length) ?? [];
  return (
    <section id="about-me" aria-labelledby="about-me-heading" className="scroll-mt-28 rounded-tile border-2 border-butter bg-butter/20 p-4">
      <h2 id="about-me-heading" className="text-sm font-semibold text-ink">
        {title}
      </h2>
      {notes.length > 0 ? (
        <>
          <p className="mt-0.5 text-xs text-slate-light">
            Goes first on the summary. Untick anything to leave it off this one visit — it stays on your Me page.
          </p>
          <ul className="mt-3 grid gap-2">
            {notes.map((n) => {
              const on = !copy?.off.includes(n.id);
              return (
                <li key={n.id}>
                  <label className="flex cursor-pointer items-start gap-3 rounded-tile bg-white/70 px-3 py-2.5">
                    <input type="checkbox" checked={on} onChange={() => onToggle(n.id)} className="mt-0.5 h-5 w-5 shrink-0" />
                    <span className={`text-sm leading-relaxed ${on ? "text-ink" : "text-slate-light line-through"}`}>
                      <span className="font-semibold">{meNote(n.id).title}:</span> {n.lines.join("; ")}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </>
      ) : (
        <p className="mt-1 text-sm text-ink">
          {boardReady && boardHasNotes
            ? "Your Me page has notes this draft doesn't have yet."
            : parentFor
              ? `Fill in the Me board so the doctor knows how ${parentFor} usually is.`
              : "Fill in your Me page so your doctor knows how you usually are."}{" "}
          {!(boardReady && boardHasNotes) && (
            <Link to="/me" className="font-semibold text-link underline underline-offset-2 hover:text-navy">
              {parentFor ? "Go to the Me board →" : "Go to my Me page →"}
            </Link>
          )}
        </p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
        {notes.length > 0 && (
          <Link to="/me" className="font-semibold text-link hover:underline">
            {parentFor ? "Change this on the Me board →" : "Change this on my Me page →"}
          </Link>
        )}
        {boardReady && boardHasNotes && (
          <button type="button" onClick={onUpdate} className="min-h-[36px] text-xs font-semibold text-link underline underline-offset-2 hover:text-navy">
            {parentFor ? "Update from the Me board" : "Update from my Me page"}
          </button>
        )}
      </div>
    </section>
  );
}

// ---- Summary ----
// The on-screen summary deliberately mirrors the PDF's structure, so what you
// see here is what lands on the page — including when it goes to the printer.

function SummaryView({
  form,
  checkIns,
  calendar = null,
  onBack,
  date,
  backLabel = "← Back to edit",
}: {
  form: AppointmentForm;
  /** The My Voice check-ins picked for this summary, newest first. */
  checkIns: CheckIn[];
  /** "From my symptom calendar", printed as its own page at the end. */
  calendar?: CalendarPageText | null;
  onBack: () => void;
  /** When the summary was made; today, unless it's one from the history. */
  date?: string;
  backLabel?: string;
}) {
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  // The body map from the newest picked check-in that marked one; the PDF
  // draws the same one.
  const painCheckIn = checkIns.find((c) => c.pain?.length) ?? null;

  // Async because the PDF loads the site's typeface before drawing; the button
  // says so rather than looking dead for the moment that takes.
  // Print sends the same PDF to the printer, so both come out alike.
  async function downloadPdf(print = false) {
    setDownloading(true);
    setDownloadError(null);
    try {
      const doc = await buildAppointmentPdf(form, checkIns, date, calendar);
      if (print) return printPdf(doc);
      const namePart = form.patientName.trim()
        ? form.patientName.trim().toLowerCase().replace(/\s+/g, "-")
        : "visit-summary";
      doc.save(`${namePart}-appointment-summary.pdf`);
    } catch (err) {
      console.error(err);
      if (print) window.print();
      else setDownloadError("Couldn't build the PDF. You can use Print instead.");
    } finally {
      setDownloading(false);
    }
  }

  const aboutRows = aboutMeRows(form.aboutMe);
  const symptoms = form.symptoms.filter((s) => s.description.trim());
  const meds = form.medications.filter((m) => m.name.trim());
  const ruledOut = form.ruledOut.filter((r) => r.description.trim());
  const questions = form.questions.filter((q) => q.text.trim());
  const usualSelf = form.timeline?.usualSelf.trim() ?? "";
  const timelineEntries = filledEntries(form.timeline);
  const near = nearbyEntries(timelineEntries);
  const bigChanges = sortEntries(timelineEntries.filter(isBigChange), true);

  return (
    <div className="btd-container py-10 max-w-2xl btd-print-root">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 print:hidden">
        <button onClick={onBack} className="text-sm text-slate hover:underline">
          {backLabel}
        </button>
        <div className="flex gap-2">
          <button
            onClick={() => downloadPdf()}
            disabled={downloading}
            className="px-4 py-2 rounded bg-ink text-paper text-sm font-semibold disabled:opacity-60"
          >
            {downloading ? "Preparing…" : "Download PDF"}
          </button>
          <button
            onClick={() => downloadPdf(true)}
            disabled={downloading}
            className="px-4 py-2 rounded border border-ink/20 text-ink text-sm font-semibold disabled:opacity-60"
          >
            Print instead
          </button>
        </div>
      </div>
      {downloadError && (
        <p className="mb-4 rounded border border-coral bg-coral/20 px-3 py-2 text-sm text-coral-ink print:hidden">
          {downloadError}
        </p>
      )}

      <article className="btd-card overflow-hidden btd-print-sheet">
        <header className="btd-dark px-8 py-7 border-b-[3px] border-sky">
          <p className="text-11 font-bold uppercase tracking-[0.14em] text-butter">
            Voiced · Visit summary
          </p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
            <h1 className="font-display text-28 font-extrabold text-mist">
              {form.patientName.trim() || "Visit summary"}
            </h1>
            <p className="text-13 text-mist/80">
              {(date ? new Date(date) : new Date()).toLocaleDateString(undefined, {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
        </header>

        <div className="px-8 py-7">
          {aboutRows.length > 0 && (
            <div className="btd-avoid-break mb-7 rounded-tile border-l-4 border-butter bg-butter/20 px-5 py-4">
              <p className="text-11 font-bold uppercase tracking-[0.1em] text-butter-ink">
                About me — please read first
              </p>
              <dl className="mt-2 grid gap-x-4 gap-y-2 sm:grid-cols-[9rem_1fr]">
                {aboutRows.map((row) => (
                  <div key={row.title} className="contents">
                    <dt className="text-sm font-semibold text-navy">{row.title}</dt>
                    <dd className="text-sm leading-relaxed text-body">{row.text}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {form.reasonForVisit.trim() && (
            <Section title="Reason for visit">
              <p className="text-sm leading-relaxed text-body whitespace-pre-wrap">
                {form.reasonForVisit}
              </p>
            </Section>
          )}

          {symptoms.length > 0 && (
            <Section title="What we're seeing">
              <ul className="space-y-3">
                {symptoms.map((s) => (
                  <SummaryItem key={s.id} title={s.description} detail={symptomDetail(s)} />
                ))}
              </ul>
            </Section>
          )}

          {feelingsOverTime(checkIns) && (
            <Section title="How they've felt, oldest first">
              <p className="text-sm leading-relaxed text-body">{feelingsOverTime(checkIns)}</p>
            </Section>
          )}

          {checkIns.map((c) => (
            <div
              key={c.id}
              className="btd-avoid-break mb-7 rounded-tile border-l-4 border-sky bg-sky-tint px-5 py-4"
            >
              <p className="text-11 font-bold uppercase tracking-[0.1em] text-link">
                In their own words ·{" "}
                {new Date(c.createdAt).toLocaleDateString(undefined, {
                  month: "long",
                  day: "numeric",
                })}
              </p>
              <ul className="mt-2 space-y-1">
                {checkInLines(c).map((line) => (
                  <li key={line} className="text-sm leading-relaxed text-navy">
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {painCheckIn && (
            <Section title="Where it hurts — their own body map">
              <ul className="space-y-3">
                {(painCheckIn.pain ?? []).map((spot) => {
                  const line = painSummaryLine(spot);
                  return <SummaryItem key={spot.area} title={line.title} detail={line.detail} />;
                })}
              </ul>
            </Section>
          )}

          {usualSelf && (
            <Section title="Their usual self, on a good day">
              <p className="text-sm leading-relaxed text-body whitespace-pre-wrap">{usualSelf}</p>
            </Section>
          )}

          {bigChanges.length > 0 && (
            <Section title="Biggest changes">
              <ul className="space-y-3">
                {bigChanges.map((e) => (
                  <TimelineSummaryItem key={e.id} entry={e} detail={timelineDetail(e)} />
                ))}
              </ul>
            </Section>
          )}

          {timelineEntries.length > 0 && (
            <Section title="Timeline, oldest first">
              <div className="space-y-4">
                {groupByMonth(timelineEntries).map((group) => (
                  <div key={group.month}>
                    <p className="mb-2 text-13 font-bold text-navy">{group.month}</p>
                    <ul className="space-y-3">
                      {group.entries.map((e) => (
                        <TimelineSummaryItem
                          key={e.id}
                          entry={e}
                          detail={timelineDetail(e, near.get(e.id))}
                        />
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {meds.length > 0 && (
            <Section title="Current medications">
              <ul className="space-y-3">
                {meds.map((m) => (
                  <SummaryItem key={m.id} title={m.name} detail={medicationLine(m)} />
                ))}
              </ul>
            </Section>
          )}

          {ruledOut.length > 0 && (
            <Section title="Already ruled out">
              <ul className="space-y-3">
                {ruledOut.map((r) => (
                  <SummaryItem
                    key={r.id}
                    title={r.description}
                    detail={r.when.trim() ? `Checked: ${r.when}` : ""}
                  />
                ))}
              </ul>
            </Section>
          )}

          {form.accommodations.trim() && (
            <Section title="How to communicate with this patient">
              <p className="text-sm leading-relaxed text-body whitespace-pre-wrap">
                {form.accommodations}
              </p>
            </Section>
          )}

          {questions.length > 0 && (
            <Section title="Questions, in priority order">
              <ol className="space-y-2">
                {questions.map((q, i) => (
                  <li key={q.id} className="btd-avoid-break flex gap-3 text-sm text-navy">
                    <span className="font-bold text-link">{i + 1}.</span>
                    <span className="leading-relaxed">{q.text}</span>
                  </li>
                ))}
              </ol>
            </Section>
          )}

          {calendar && (
            <Section title={calendar.title}>
              <p className="mb-3 text-13 text-muted">{calendar.header}</p>
              {calendar.period && (
                <ul className="mb-4 space-y-1 text-sm text-navy">
                  {[...calendar.period.cycles, ...calendar.period.days].map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              )}
              <ul className="space-y-3">
                {calendar.rows.map((r, i) => (
                  <SummaryItem key={i} title={`${r.date} — ${r.what}`} detail={r.detail} />
                ))}
              </ul>
              <p className="mt-2 text-12 text-muted">The PDF also shows these days on small month calendars.</p>
            </Section>
          )}

          <p className="btd-print-note btd-avoid-break mt-8 border-t border-navy/12 pt-4 text-11 text-muted">
            Prepared with Voiced. This is a family's own record, not a medical document.
          </p>
        </div>
      </article>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-7">
      <h2 className="text-11 font-bold uppercase tracking-[0.11em] text-link">{title}</h2>
      <div className="mt-1.5 mb-3 h-px bg-sky" />
      {children}
    </section>
  );
}

/** A timeline entry on the summary: its type in words (and an icon), then the
 *  same detail line the PDF prints. */
function TimelineSummaryItem({ entry, detail }: { entry: TimelineEntryT; detail: string }) {
  const type = timelineType(entry.type);
  return (
    <li className="btd-avoid-break border-l-[3px] border-sky pl-3">
      <p className="text-sm font-semibold text-navy">{entry.description}</p>
      <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-sky-tint px-2 py-0.5 text-11 font-bold uppercase tracking-[0.06em] text-navy">
        <Icon name={type.icon} size={13} />
        {type.short}
      </p>
      {detail && <p className="mt-0.5 text-12 text-muted">{detail}</p>}
    </li>
  );
}

function SummaryItem({ title, detail }: { title: string; detail: string }) {
  return (
    <li className="btd-avoid-break border-l-[3px] border-sky pl-3">
      <p className="text-sm font-semibold text-navy">{title}</p>
      {detail && <p className="mt-0.5 text-12 text-muted">{detail}</p>}
    </li>
  );
}
