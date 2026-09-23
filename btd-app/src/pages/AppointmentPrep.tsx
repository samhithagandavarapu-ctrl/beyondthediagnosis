import { useState } from "react";
import { Link } from "react-router-dom";
import { refineAppointmentForm } from "../lib/api";
import { useMyVoice } from "../context/MyVoiceContext";
import { CheckIn, checkInLines } from "../lib/myVoice";
import Icon from "../components/icons/Icon";
import {
  AppointmentForm,
  Medication,
  Question,
  RuledOutItem,
  Symptom,
  buildAppointmentPdf,
  medicationLine,
  symptomDetail,
} from "../lib/appointmentPdf";

const newId = () => crypto.randomUUID();

const emptySymptom = (): Symptom => ({
  id: newId(),
  description: "",
  onset: "",
  baselineOrNew: "new",
});

// Medications and ruled-out items are one entry per thing, like symptoms —
// a single free-text box turns into an unreadable wall on the printed page,
// and there's nothing to line up dose against frequency.
const emptyMedication = (): Medication => ({ id: newId(), name: "", dose: "", frequency: "" });
const emptyRuledOut = (): RuledOutItem => ({ id: newId(), description: "", when: "" });
const emptyQuestion = (): Question => ({ id: newId(), text: "" });

const emptyForm = (): AppointmentForm => ({
  patientName: "",
  reasonForVisit: "",
  symptoms: [emptySymptom()],
  medications: [emptyMedication()],
  ruledOut: [emptyRuledOut()],
  accommodations: "",
  questions: [emptyQuestion()],
});

export default function AppointmentPrep() {
  const { savedCheckIn, clearCheckIn } = useMyVoice();
  const [form, setForm] = useState<AppointmentForm>(emptyForm());
  // Opt-in on purpose: the check-in belongs to the person who made it, so it
  // only reaches the provider summary if someone says yes here.
  const [includeMyVoice, setIncludeMyVoice] = useState(true);
  const [showSummary, setShowSummary] = useState(false);
  const [refining, setRefining] = useState(false);
  const [refineError, setRefineError] = useState<string | null>(null);

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
      });

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

  const myVoice = includeMyVoice ? savedCheckIn : null;

  if (showSummary) {
    return <SummaryView form={form} myVoice={myVoice} onBack={() => setShowSummary(false)} />;
  }

  return (
    <div className="btd-container py-10 max-w-2xl">
      <h1 className="text-3xl font-display font-semibold mb-2">Appointment Prep Tool</h1>
      <p className="text-slate mb-8">
        Fill this out before your visit. It generates a clean, downloadable one-page
        summary you can bring straight to your provider — so nothing gets lost in a
        rushed appointment.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
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
                <input
                  className="btd-input"
                  placeholder="When did it start? (onset / duration)"
                  value={s.onset}
                  onChange={(e) => updateItem("symptoms", s.id, { onset: e.target.value })}
                />
                <select
                  className="btd-input"
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

        <MyVoiceSection
          checkIn={savedCheckIn}
          include={includeMyVoice}
          onIncludeChange={setIncludeMyVoice}
          onClear={clearCheckIn}
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
      </form>
    </div>
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
}: {
  form: AppointmentForm;
  myVoice: CheckIn | null;
  onBack: () => void;
}) {
  function downloadPdf() {
    const doc = buildAppointmentPdf(form, myVoice);
    const namePart = form.patientName.trim()
      ? form.patientName.trim().toLowerCase().replace(/\s+/g, "-")
      : "visit-summary";
    doc.save(`${namePart}-appointment-summary.pdf`);
  }

  const symptoms = form.symptoms.filter((s) => s.description.trim());
  const meds = form.medications.filter((m) => m.name.trim());
  const ruledOut = form.ruledOut.filter((r) => r.description.trim());
  const questions = form.questions.filter((q) => q.text.trim());

  return (
    <div className="btd-container py-10 max-w-2xl btd-print-root">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 print:hidden">
        <button onClick={onBack} className="text-sm text-slate hover:underline">
          ← Back to edit
        </button>
        <div className="flex gap-2">
          <button
            onClick={downloadPdf}
            className="px-4 py-2 rounded bg-ink text-paper text-sm font-semibold"
          >
            Download PDF
          </button>
          <button
            onClick={() => window.print()}
            className="px-4 py-2 rounded border border-ink/20 text-ink text-sm font-semibold"
          >
            Print instead
          </button>
        </div>
      </div>

      <article className="btd-card overflow-hidden btd-print-sheet">
        <header className="btd-dark px-8 py-7 border-b-[3px] border-sky">
          <p className="text-11 font-bold uppercase tracking-[0.14em] text-butter">
            Verity · Visit summary
          </p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
            <h1 className="font-display text-28 font-extrabold text-mist">
              {form.patientName.trim() || "Visit summary"}
            </h1>
            <p className="text-13 text-mist/80">
              {new Date().toLocaleDateString(undefined, {
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
            Prepared with Verity. This is a family's own record, not a medical document.
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

function SummaryItem({ title, detail }: { title: string; detail: string }) {
  return (
    <li className="btd-avoid-break border-l-[3px] border-sky pl-3">
      <p className="text-sm font-semibold text-navy">{title}</p>
      {detail && <p className="mt-0.5 text-12 text-muted">{detail}</p>}
    </li>
  );
}
