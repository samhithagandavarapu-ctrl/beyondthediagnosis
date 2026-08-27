import { useState } from "react";

type Symptom = {
  id: string;
  description: string;
  onset: string;
  baselineOrNew: "baseline" | "new";
};

type FormState = {
  patientName: string;
  reasonForVisit: string;
  symptoms: Symptom[];
  medications: string;
  ruledOut: string;
  accommodations: string;
  questions: string;
};

const emptySymptom = (): Symptom => ({
  id: crypto.randomUUID(),
  description: "",
  onset: "",
  baselineOrNew: "new",
});

const emptyForm = (): FormState => ({
  patientName: "",
  reasonForVisit: "",
  symptoms: [emptySymptom()],
  medications: "",
  ruledOut: "",
  accommodations: "",
  questions: "",
});

export default function AppointmentPrep() {
  const [form, setForm] = useState<FormState>(emptyForm());
  const [showSummary, setShowSummary] = useState(false);

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

  if (showSummary) {
    return <SummaryView form={form} onBack={() => setShowSummary(false)} />;
  }

  return (
    <div className="btd-container py-10 max-w-2xl">
      <h1 className="text-3xl font-display font-semibold mb-2">Appointment Prep Tool</h1>
      <p className="text-slate mb-8">
        Fill this out before your visit. It generates a clean one-page summary you can
        print or hand directly to your provider — so nothing gets lost in a rushed
        appointment.
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

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-sm text-ink">Symptoms</span>
            <button
              type="button"
              onClick={addSymptom}
              className="text-xs font-semibold text-gold-dark hover:underline"
            >
              + Add another symptom
            </button>
          </div>
          <div className="space-y-4">
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
          </div>
        </div>

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

        <Field label="Communication or accommodation needs">
          <textarea
            className="btd-input min-h-[70px]"
            value={form.accommodations}
            onChange={(e) => setForm({ ...form, accommodations: e.target.value })}
            placeholder="e.g. extra time to answer, picture-based options, speak directly to the patient first"
          />
        </Field>

        <Field label="Prioritized questions">
          <textarea
            className="btd-input min-h-[90px]"
            value={form.questions}
            onChange={(e) => setForm({ ...form, questions: e.target.value })}
            placeholder="List your questions in the order you most want answered — one per line"
          />
        </Field>

        <button
          type="submit"
          className="px-5 py-3 rounded bg-ink text-paper font-semibold hover:bg-slate transition-colors"
        >
          Generate summary
        </button>
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

function SummaryView({ form, onBack }: { form: FormState; onBack: () => void }) {
  return (
    <div className="btd-container py-10 max-w-2xl">
      <div className="flex items-center justify-between mb-6 print:hidden">
        <button onClick={onBack} className="text-sm text-slate hover:underline">
          ← Back to edit
        </button>
        <button
          onClick={() => window.print()}
          className="px-4 py-2 rounded bg-ink text-paper text-sm font-semibold"
        >
          Print / save as PDF
        </button>
      </div>

      <div className="btd-card p-8">
        <h1 className="text-2xl font-display font-semibold mb-1">
          Visit Summary{form.patientName ? ` — ${form.patientName}` : ""}
        </h1>
        <p className="text-xs text-slate-light mb-6">
          Prepared with Beyond the Diagnosis · {new Date().toLocaleDateString()}
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

        <SummarySection title="Current medications" body={form.medications} />
        <SummarySection title="Already ruled out" body={form.ruledOut} />
        <SummarySection title="Communication / accommodation needs" body={form.accommodations} />
        <SummarySection title="Questions, in priority order" body={form.questions} />
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
