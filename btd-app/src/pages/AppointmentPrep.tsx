import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { refineAppointmentForm } from "../lib/api";
import { useMyVoice } from "../context/MyVoiceContext";
import { usePracticeMode } from "../context/PracticeModeContext";
import { useAuth } from "../context/AuthContext";
import {
  HistoryEntry,
  addToHistory,
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
import { CheckIn, checkInLines } from "../lib/myVoice";
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
  medicationLine,
  symptomDetail,
  SYMPTOM_AREAS,
  timelineDetail,
} from "../lib/appointmentPdf";
import { inkLastWord } from "../components/Scribble";

export default function AppointmentPrep() {
  const { clearCheckIn } = useMyVoice();
  const { practice } = usePracticeMode();
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id ?? null;

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
  // Opt-in on purpose: the check-in belongs to the person who made it, so it
  // only reaches the provider summary if someone says yes here.
  const [includeMyVoice, setIncludeMyVoice] = useState(true);
  const [showSummary, setShowSummary] = useState(false);
  const [refining, setRefining] = useState(false);
  const [refineError, setRefineError] = useState<string | null>(null);

  // Drafts saved before the timeline existed have none; treat that as empty.
  const timeline = form.timeline ?? emptyTimeline();
  const refinableEntries = filledEntries(timeline);

  async function handleRefine() {
    setRefining(true);
    setRefineError(null);
    try {
      const refined = await refineAppointmentForm({
        reasonForVisit: form.reasonForVisit,
        symptoms: form.symptoms.map((s) => ({ description: s.description, onset: s.onset })),
        medications: form.medications.map((m) => ({
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
            ? refined.symptoms.map((s, i) => ({
                id: f.symptoms[i]?.id ?? newId(),
                description: s.description,
                onset: s.onset,
                baselineOrNew: f.symptoms[i]?.baselineOrNew ?? "new",
                area: f.symptoms[i]?.area,
              }))
            : f.symptoms,
        medications:
          refined.medications?.length
            ? refined.medications.map((m, i) => ({
                id: f.medications[i]?.id ?? newId(),
                name: m.name,
                dose: m.dose,
                frequency: m.frequency,
              }))
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
    listDrafts(userId).then((res) => {
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
  }, [userId, authLoading]);

  // Saved as you type, a moment after you stop. Practice mode is a rehearsal,
  // so it keeps nothing — the real draft is left exactly as it was.
  useEffect(() => {
    if (!loaded || practice) return;
    const snap = snapshot(draftName, form, draftMyVoice);
    if (snap === lastSaved.current) return;
    if (formIsEmpty(form) && !draftMyVoice && !draftName.trim()) return;
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
      saveDraft(userId, d).then((where) => {
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
    saveDraft(userId, renamed);
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
    const where = await saveDraft(userId, d);
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

  const myVoice = includeMyVoice ? draftMyVoice : null;

  if (viewing) {
    return (
      <SummaryView
        form={viewing.form}
        myVoice={viewing.myVoice}
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
    return <SummaryView form={form} myVoice={myVoice} onBack={() => setShowSummary(false)} />;
  }

  return (
    <div className="btd-container py-10 max-w-2xl">
      <h1 className="text-3xl font-display font-semibold mb-2">{inkLastWord("Appointment Prep Tool")}</h1>
      <p className="text-slate mb-4">
        Fill this out before your visit. It generates a clean, downloadable one-page
        summary you can bring straight to your provider — so nothing gets lost in a
        rushed appointment.
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

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!practice && !formIsEmpty(form)) setHistory(addToHistory(form, myVoice));
          setShowSummary(true);
        }}
        className="space-y-8"
      >
        <Field label="Patient name">
          <input
            className="btd-input"
            value={form.patientName}
            onChange={(e) => setForm({ ...form, patientName: e.target.value })}
            placeholder="Who is this visit for?"
          />
        </Field>

        <Field label="Reason for visit">
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

        <ListSection
          label="Symptoms"
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
                  placeholder="When did it start? (onset / duration)"
                  value={s.onset}
                  onChange={(e) => updateItem("symptoms", s.id, { onset: e.target.value })}
                />
                <select
                  className="btd-input sm:col-span-2"
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
            </EntryCard>
          ))}
        </ListSection>

        <SymptomTimeline
          value={timeline}
          onChange={(t: Timeline) => setForm((f) => ({ ...f, timeline: t }))}
        />

        <MyVoiceSection
          checkIn={draftMyVoice}
          include={includeMyVoice}
          onIncludeChange={setIncludeMyVoice}
          onClear={() => {
            setDraftMyVoice(null);
            clearCheckIn();
          }}
        />

        <ListSection
          label="Current medications"
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

        <ListSection
          label="Prioritized questions"
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

        {refineError && (
          <p className="text-sm text-clay bg-clay/10 border border-clay/30 rounded px-4 py-3">
            {refineError}
          </p>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleRefine}
            disabled={refining}
            className="inline-flex items-center gap-2 px-5 py-3 rounded border border-gold text-gold-dark font-semibold hover:bg-gold/10 transition-colors disabled:opacity-50"
          >
            <Icon name="refine" size={18} />
            {refining ? "Refining…" : "Refine with AI"}
          </button>
          <button
            type="submit"
            className="px-5 py-3 rounded bg-ink text-paper font-semibold hover:bg-slate transition-colors"
          >
            Generate summary
          </button>
        </div>

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
      </form>

      <HistorySection
        entries={history}
        onView={setViewing}
        onReuse={reuseEntry}
        onDelete={deleteEntry}
      />
    </div>
  );
}

function HistorySection({
  entries,
  onView,
  onReuse,
  onDelete,
}: {
  entries: HistoryEntry[];
  onView: (entry: HistoryEntry) => void;
  onReuse: (entry: HistoryEntry) => void;
  onDelete: (entry: HistoryEntry) => void;
}) {
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
          {entries.map((entry) => (
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
  label,
  addLabel,
  onAdd,
  children,
}: {
  label: string;
  addLabel: string;
  onAdd: () => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold text-sm text-ink">{label}</span>
        <button
          type="button"
          onClick={onAdd}
          className="text-xs font-semibold text-gold-dark hover:underline"
        >
          {addLabel}
        </button>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
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
    where = "Practice mode: nothing you type here is saved, and it won't go in your history.";
  } else if (store === "account") {
    where = "Saved to your account as you type, so it's here on any device you sign in on.";
  } else if (signedIn && accountMissing) {
    where = "Saved on this device as you type. Saving to your account isn't switched on yet.";
  } else {
    where = "Saved on this device as you type, and never uploaded. Sign in to keep your drafts on any device.";
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
    <section aria-labelledby="drafts-heading" className="btd-card mb-8 p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0 flex-1">
          <label id="drafts-heading" htmlFor="draft-name" className="block text-sm font-bold text-navy">
            This draft
          </label>
          <input
            id="draft-name"
            className="btd-input mt-1.5"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder={placeholder}
            aria-describedby="draft-where"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {current && (
            <button
              type="button"
              onClick={() => onDelete(current)}
              className="btd-btn min-h-[40px] px-4 text-sm font-semibold text-clay hover:underline"
            >
              Delete
            </button>
          )}
          <button type="button" onClick={onNew} className="btd-btn-sky min-h-[40px] px-4 text-sm">
            + New draft
          </button>
        </div>
      </div>

      <p id="draft-where" className="mt-3 text-13 text-sky-ink">
        {where}
        {status && (
          <span className="ml-1 font-semibold text-navy" aria-live="polite">
            {status}
          </span>
        )}
      </p>

      {drafts.length > 0 && (
        <div className="mt-5 border-t border-navy/[0.08] pt-4">
          <button
            type="button"
            onClick={() => setListOpen((v) => !v)}
            aria-expanded={listOpen}
            aria-controls="drafts-grid"
            className="flex w-full items-center justify-between gap-2 rounded-tile text-left text-sm font-bold text-navy hover:text-link"
          >
            <span>Your drafts ({drafts.length})</span>
            <Icon
              name="chevron-right"
              size={18}
              className={`transition-transform ${listOpen ? "-rotate-90" : "rotate-90"}`}
            />
          </button>
          {listOpen && (
          <ul id="drafts-grid" className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
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
          )}
          {listOpen && drafts.length > 6 && (
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
    <div className="rounded-tile border border-navy/16 bg-mist p-4">
      {!naming ? (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={empty}
            onClick={() => {
              setName(suggestedName);
              setDone(null);
              setNaming(true);
            }}
            className="btd-btn-sky min-h-[44px] px-5 text-sm disabled:opacity-40"
          >
            Save to my drafts
          </button>
          <p className="text-sm text-slate" role="status">
            {done ?? (empty ? "Fill in the form first, then save it here." : "Give it a name so it's easy to find later.")}
          </p>
        </div>
      ) : (
        <div>
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
    </div>
  );
}

function MyVoiceSection({
  checkIn,
  include,
  onIncludeChange,
  onClear,
}: {
  checkIn: CheckIn | null;
  include: boolean;
  onIncludeChange: (include: boolean) => void;
  onClear: () => void;
}) {
  if (!checkIn) {
    return (
      <div className="rounded-tile border border-dashed border-navy/20 bg-mist p-4">
        <p className="text-sm font-semibold text-ink">In their own words</p>
        <p className="mt-1 text-sm text-slate">
          Nothing from My Voice yet. If the person this visit is for does a check-in in{" "}
          <Link to="/my-voice" className="font-semibold text-link hover:underline">
            My Voice
          </Link>
          , what they said can be printed on this summary — in their words, not yours.
        </p>
      </div>
    );
  }

  const lines = checkInLines(checkIn);
  return (
    <div className="rounded-tile border-2 border-sky bg-sky-tint p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-ink">In their own words (from My Voice)</p>
          <p className="text-xs text-slate-light">
            Checked in {new Date(checkIn.createdAt).toLocaleDateString()}
          </p>
        </div>
        <button type="button" onClick={onClear} className="text-xs text-clay hover:underline">
          Remove this check-in
        </button>
      </div>
      <ul className="mt-3 space-y-1">
        {lines.map((line) => (
          <li key={line} className="border-l-2 border-sky pl-3 text-sm text-ink">
            {line}
          </li>
        ))}
      </ul>
      <label className="mt-3 flex items-center gap-2 text-sm font-medium text-ink">
        <input
          type="checkbox"
          checked={include}
          onChange={(e) => onIncludeChange(e.target.checked)}
          className="h-4 w-4"
        />
        Put this on the summary
      </label>
    </div>
  );
}

// ---- Summary ----
// The on-screen summary deliberately mirrors the PDF's structure, so what you
// see here is what lands on the page — including when it goes to the printer.

function SummaryView({
  form,
  myVoice,
  onBack,
  date,
  backLabel = "← Back to edit",
}: {
  form: AppointmentForm;
  myVoice: CheckIn | null;
  onBack: () => void;
  /** When the summary was made; today, unless it's one from the history. */
  date?: string;
  backLabel?: string;
}) {
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  // Async because the PDF loads the site's typeface before drawing; the button
  // says so rather than looking dead for the moment that takes.
  async function downloadPdf() {
    setDownloading(true);
    setDownloadError(null);
    try {
      const doc = await buildAppointmentPdf(form, myVoice, date);
      const namePart = form.patientName.trim()
        ? form.patientName.trim().toLowerCase().replace(/\s+/g, "-")
        : "visit-summary";
      doc.save(`${namePart}-appointment-summary.pdf`);
    } catch (err) {
      console.error(err);
      setDownloadError("Couldn't build the PDF. You can use Print instead.");
    } finally {
      setDownloading(false);
    }
  }

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
            onClick={downloadPdf}
            disabled={downloading}
            className="px-4 py-2 rounded bg-ink text-paper text-sm font-semibold disabled:opacity-60"
          >
            {downloading ? "Preparing…" : "Download PDF"}
          </button>
          <button
            onClick={() => window.print()}
            className="px-4 py-2 rounded border border-ink/20 text-ink text-sm font-semibold"
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

          {myVoice && (
            <div className="btd-avoid-break mb-7 rounded-tile border-l-4 border-sky bg-sky-tint px-5 py-4">
              <p className="text-11 font-bold uppercase tracking-[0.1em] text-link">
                In their own words ·{" "}
                {new Date(myVoice.createdAt).toLocaleDateString(undefined, {
                  month: "long",
                  day: "numeric",
                })}
              </p>
              <ul className="mt-2 space-y-1">
                {checkInLines(myVoice).map((line) => (
                  <li key={line} className="text-sm leading-relaxed text-navy">
                    {line}
                  </li>
                ))}
              </ul>
            </div>
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
