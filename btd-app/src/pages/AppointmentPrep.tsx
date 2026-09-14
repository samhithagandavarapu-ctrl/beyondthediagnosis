import { useState } from "react";
import { jsPDF } from "jspdf";
import { Link } from "react-router-dom";
import { refineAppointmentForm } from "../lib/api";
import { useMyVoice } from "../context/MyVoiceContext";
import { CheckIn, checkInLines } from "../lib/myVoice";

type Symptom = {
  id: string;
  description: string;
  onset: string;
  baselineOrNew: "baseline" | "new";
};

type Question = {
  id: string;
  text: string;
};

type FormState = {
  patientName: string;
  reasonForVisit: string;
  symptoms: Symptom[];
  medications: string;
  ruledOut: string;
  accommodations: string;
  questions: Question[];
};

const newId = () => crypto.randomUUID();

const emptySymptom = (): Symptom => ({
  id: newId(),
  description: "",
  onset: "",
  baselineOrNew: "new",
});

const emptyQuestion = (): Question => ({ id: newId(), text: "" });

const emptyForm = (): FormState => ({
  patientName: "",
  reasonForVisit: "",
  symptoms: [emptySymptom()],
  medications: "",
  ruledOut: "",
  accommodations: "",
  questions: [emptyQuestion()],
});

export default function AppointmentPrep() {
  const { savedCheckIn, clearCheckIn } = useMyVoice();
  const [form, setForm] = useState<FormState>(emptyForm());
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
      const payload = {
        reasonForVisit: form.reasonForVisit,
        symptoms: form.symptoms.map((s) => ({ description: s.description, onset: s.onset })),
        medications: form.medications,
        ruledOut: form.ruledOut,
        accommodations: form.accommodations,
        questions: form.questions.map((q) => q.text),
      };
      const refined = await refineAppointmentForm(payload);

      setForm((f) => ({
        ...f,
        reasonForVisit: refined.reasonForVisit ?? f.reasonForVisit,
        medications: refined.medications ?? f.medications,
        ruledOut: refined.ruledOut ?? f.ruledOut,
        accommodations: refined.accommodations ?? f.accommodations,
        symptoms:
          refined.symptoms && refined.symptoms.length > 0
            ? refined.symptoms.map((s, i) => ({
                id: f.symptoms[i]?.id ?? newId(),
                description: s.description,
                onset: s.onset,
                baselineOrNew: f.symptoms[i]?.baselineOrNew ?? "new",
              }))
            : f.symptoms,
        questions:
          refined.questions && refined.questions.length > 0
            ? refined.questions.map((text, i) => ({
                id: f.questions[i]?.id ?? newId(),
                text,
              }))
            : f.questions,
      }));
    } catch (err) {
      setRefineError(
        "Couldn't refine this right now. Make sure the API server is running and ANTHROPIC_API_KEY is set."
      );
    } finally {
      setRefining(false);
    }
  }

  function updateSymptom(id: string, patch: Partial<Symptom>) {
    setForm((f) => ({
      ...f,
      symptoms: f.symptoms.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    }));
  }

  function addSymptom() {
    setForm((f) => ({ ...f, symptoms: [...f.symptoms, emptySymptom()] }));
  }

  function removeSymptom(id: string) {
    setForm((f) => ({ ...f, symptoms: f.symptoms.filter((s) => s.id !== id) }));
  }

  function updateQuestion(id: string, text: string) {
    setForm((f) => ({
      ...f,
      questions: f.questions.map((q) => (q.id === id ? { ...q, text } : q)),
    }));
  }

  function addQuestion() {
    setForm((f) => ({ ...f, questions: [...f.questions, emptyQuestion()] }));
  }

  function removeQuestion(id: string) {
    setForm((f) => ({ ...f, questions: f.questions.filter((q) => q.id !== id) }));
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
          onAdd={addSymptom}
        >
          {form.symptoms.map((s, i) => (
            <div key={s.id} className="btd-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wide text-slate-light font-semibold">
                  Symptom {i + 1}
                </span>
                {form.symptoms.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeSymptom(s.id)}
                    className="text-xs text-clay hover:underline"
                  >
                    Remove
                  </button>
                )}
              </div>
              <input
                className="btd-input"
                placeholder="Describe the symptom"
                value={s.description}
                onChange={(e) => updateSymptom(s.id, { description: e.target.value })}
              />
              <div className="grid sm:grid-cols-2 gap-3">
                <input
                  className="btd-input"
                  placeholder="When did it start? (onset / duration)"
                  value={s.onset}
                  onChange={(e) => updateSymptom(s.id, { onset: e.target.value })}
                />
                <select
                  className="btd-input"
                  value={s.baselineOrNew}
                  onChange={(e) =>
                    updateSymptom(s.id, {
                      baselineOrNew: e.target.value as Symptom["baselineOrNew"],
                    })
                  }
                >
                  <option value="new">New — not typical for this person</option>
                  <option value="baseline">Baseline — part of how they usually are</option>
                </select>
              </div>
            </div>
          ))}
        </ListSection>

        <Field label="Current medications">
          <textarea
            className="btd-input min-h-[70px]"
            value={form.medications}
            onChange={(e) => setForm({ ...form, medications: e.target.value })}
            placeholder="Name, dose, and how often — one per line"
          />
        </Field>

        <Field label="Already ruled out">
          <textarea
            className="btd-input min-h-[70px]"
            value={form.ruledOut}
            onChange={(e) => setForm({ ...form, ruledOut: e.target.value })}
            placeholder="Tests, conditions, or explanations already checked and ruled out"
          />
        </Field>

        <MyVoiceSection
          checkIn={savedCheckIn}
          include={includeMyVoice}
          onIncludeChange={setIncludeMyVoice}
          onClear={clearCheckIn}
        />

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
          onAdd={addQuestion}
        >
          {form.questions.map((q, i) => (
            <div key={q.id} className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-light w-5 shrink-0">
                {i + 1}.
              </span>
              <input
                className="btd-input"
                placeholder="A single question you want answered"
                value={q.text}
                onChange={(e) => updateQuestion(q.id, e.target.value)}
              />
              {form.questions.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeQuestion(q.id)}
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
            className="px-5 py-3 rounded border border-gold text-gold-dark font-semibold hover:bg-gold/10 transition-colors disabled:opacity-50"
          >
            {refining ? "Refining…" : "✨ Refine with AI"}
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block font-semibold text-sm text-ink mb-2">{label}</label>
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

// ---- Real PDF generation (jsPDF) ----
function buildPdf(form: FormState, myVoice: CheckIn | null): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const marginX = 56;
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - marginX * 2;
  let y = 64;

  const goldDark = "#8C6D1F";
  const ink = "#1C2B33";
  const slate = "#5B6E77";

  function ensureSpace(lines: number, lineHeight = 14) {
    const needed = lines * lineHeight;
    if (y + needed > doc.internal.pageSize.getHeight() - 56) {
      doc.addPage();
      y = 64;
    }
  }

  function heading(text: string) {
    ensureSpace(2, 20);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(goldDark);
    doc.text(text.toUpperCase(), marginX, y);
    y += 16;
    doc.setTextColor(ink);
  }

  function paragraph(text: string) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(ink);
    const lines = doc.splitTextToSize(text, contentWidth);
    ensureSpace(lines.length, 15);
    doc.text(lines, marginX, y);
    y += lines.length * 15 + 12;
  }

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(ink);
  doc.text(
    `Visit Summary${form.patientName ? ` — ${form.patientName}` : ""}`,
    marginX,
    y
  );
  y += 20;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(slate);
  doc.text(
    `Prepared with Verity · ${new Date().toLocaleDateString()}`,
    marginX,
    y
  );
  y += 28;

  if (form.reasonForVisit.trim()) {
    heading("Reason for visit");
    paragraph(form.reasonForVisit);
  }

  const symptoms = form.symptoms.filter((s) => s.description.trim());
  if (symptoms.length > 0) {
    heading("Symptoms");
    symptoms.forEach((s) => {
      const detail = [
        s.onset ? `Onset: ${s.onset}` : "",
        s.baselineOrNew === "new" ? "New for this person" : "Part of baseline",
      ]
        .filter(Boolean)
        .join(" · ");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(ink);
      const lines = doc.splitTextToSize(`• ${s.description}`, contentWidth);
      ensureSpace(lines.length + 1, 15);
      doc.text(lines, marginX, y);
      y += lines.length * 15;
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9.5);
      doc.setTextColor(slate);
      doc.text(detail, marginX + 12, y);
      y += 18;
    });
    y += 4;
  }

  if (myVoice) {
    heading("In their own words (My Voice)");
    checkInLines(myVoice).forEach((line) => paragraph(line));
  }

  if (form.medications.trim()) {
    heading("Current medications");
    paragraph(form.medications);
  }

  if (form.ruledOut.trim()) {
    heading("Already ruled out");
    paragraph(form.ruledOut);
  }

  if (form.accommodations.trim()) {
    heading("Communication / accommodation needs");
    paragraph(form.accommodations);
  }

  const questions = form.questions.filter((q) => q.text.trim());
  if (questions.length > 0) {
    heading("Questions, in priority order");
    questions.forEach((q, i) => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(ink);
      const lines = doc.splitTextToSize(`${i + 1}. ${q.text}`, contentWidth);
      ensureSpace(lines.length, 15);
      doc.text(lines, marginX, y);
      y += lines.length * 15 + 4;
    });
  }

  return doc;
}

function SummaryView({
  form,
  myVoice,
  onBack,
}: {
  form: FormState;
  myVoice: CheckIn | null;
  onBack: () => void;
}) {
  function downloadPdf() {
    const doc = buildPdf(form, myVoice);
    const namePart = form.patientName.trim()
      ? form.patientName.trim().toLowerCase().replace(/\s+/g, "-")
      : "visit-summary";
    doc.save(`${namePart}-appointment-summary.pdf`);
  }

  return (
    <div className="btd-container py-10 max-w-2xl">
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

      <div className="btd-card p-8">
        <h1 className="text-2xl font-display font-semibold mb-1">
          Visit Summary{form.patientName ? ` — ${form.patientName}` : ""}
        </h1>
        <p className="text-xs text-slate-light mb-6">
          Prepared with Verity · {new Date().toLocaleDateString()}
        </p>

        <SummarySection title="Reason for visit" body={form.reasonForVisit} />

        <div className="mb-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-light mb-2">
            Symptoms
          </h2>
          <ul className="space-y-2">
            {form.symptoms
              .filter((s) => s.description.trim())
              .map((s) => (
                <li key={s.id} className="text-sm border-l-2 border-gold pl-3">
                  <p className="font-medium text-ink">{s.description}</p>
                  <p className="text-slate-light">
                    {s.onset ? `Onset: ${s.onset} · ` : ""}
                    {s.baselineOrNew === "new" ? "New for this person" : "Part of baseline"}
                  </p>
                </li>
              ))}
          </ul>
        </div>

        {myVoice && (
          <div className="mb-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-light mb-2">
              In their own words (My Voice)
            </h2>
            <ul className="space-y-1">
              {checkInLines(myVoice).map((line) => (
                <li key={line} className="border-l-2 border-sky pl-3 text-sm text-ink">
                  {line}
                </li>
              ))}
            </ul>
          </div>
        )}

        <SummarySection title="Current medications" body={form.medications} />
        <SummarySection title="Already ruled out" body={form.ruledOut} />
        <SummarySection title="Communication / accommodation needs" body={form.accommodations} />

        <div className="mb-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-light mb-2">
            Questions, in priority order
          </h2>
          <ol className="list-decimal list-inside space-y-1">
            {form.questions
              .filter((q) => q.text.trim())
              .map((q) => (
                <li key={q.id} className="text-sm text-ink">
                  {q.text}
                </li>
              ))}
          </ol>
        </div>
      </div>
    </div>
  );
}

function SummarySection({ title, body }: { title: string; body: string }) {
  if (!body.trim()) return null;
  return (
    <div className="mb-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-light mb-1">
        {title}
      </h2>
      <p className="text-sm text-ink whitespace-pre-wrap leading-relaxed">{body}</p>
    </div>
  );
}
