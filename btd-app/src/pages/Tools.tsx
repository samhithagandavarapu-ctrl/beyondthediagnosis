import { Link } from "react-router-dom";
import PageHero from "../components/PageHero";
import { LIFE_STAGES } from "../data/resources";
import { STARTER_PROMPTS } from "./Assistant";

const prepSteps = [
  ["1. Log what changed", "Dates, patterns, and what you've already tried."],
  ["2. Add your questions", "Including the ones that are easy to forget in the room."],
  ["3. Print one page", "Hand it over, or send it ahead of the visit."],
];

const myVoiceSteps = [
  ["Show how you feel", "Tap where it hurts and pick a face — no reading required."],
  ["Tell my doctor", "Taps become a sentence you can say, or print on the summary."],
  ["Know what happens", "A picture walkthrough of the visit, arrival to done."],
];

export default function Tools() {
  return (
    <div>
      <PageHero
        eyebrow="The tools"
        title="Free tools for the fifteen minutes you get with a provider"
        lede="Every family-facing tool here is free, and stays free. None of them diagnose — they help you show up documented, specific, and hard to wave off."
      />
      <section className="btd-container pt-14 pb-20 grid gap-[22px]">
        <article className="btd-card p-[30px] grid gap-5 items-start md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <div>
            <h2 className="text-28 font-extrabold">AI Advocacy Assistant</h2>
            <p className="my-4 max-w-[36em] text-base leading-[1.7] text-body">
              Education and advocacy support only — it never diagnoses, never recommends
              medication, and always defers to your provider's care plan. Ask it how to
              phrase a concern, what your rights are at an appointment, or how to describe
              a symptom that's hard to put into words.
            </p>
            <Link to="/assistant" className="btd-btn-coral min-h-[48px] px-6 py-3.5 text-base">
              Open the assistant →
            </Link>
          </div>
          <div className="rounded-2xl bg-mist p-[18px] grid gap-2.5">
            <p className="text-12 font-bold uppercase tracking-[0.1em] text-link">
              People start with
            </p>
            {STARTER_PROMPTS.map((p) => (
              <span
                key={p}
                className="rounded-xl border border-navy/[0.14] bg-white px-3.5 py-3 text-sm leading-[1.5]"
              >
                {p}
              </span>
            ))}
          </div>
        </article>

        <article className="btd-card p-[30px]">
          <span className="btd-tag bg-butter">Always free</span>
          <h2 className="mt-3.5 mb-2 text-28 font-extrabold">Appointment Prep Tool</h2>
          <p className="mb-[18px] max-w-[44em] text-base leading-[1.7] text-body">
            Symptoms, medications, and questions become a clean one-page summary — a
            timeline a provider can scan in thirty seconds and a record you keep between
            visits.
          </p>
          <div className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(min(100%,200px),1fr))]">
            {prepSteps.map(([label, text]) => (
              <div key={label} className="rounded-tile bg-mist p-4">
                <p className="text-13 font-bold text-link">{label}</p>
                <p className="mt-1.5 text-sm leading-[1.55] text-body">{text}</p>
              </div>
            ))}
          </div>
          <Link to="/appointment-prep" className="btd-btn-sky mt-5 min-h-[46px] px-[22px] py-3 text-15">
            Build a summary →
          </Link>
        </article>

        <article className="btd-card p-[30px]">
          <span className="btd-tag bg-sky">For the person, not the paperwork</span>
          <h2 className="mt-3.5 mb-2 text-28 font-extrabold">My Voice</h2>
          <p className="mb-[18px] max-w-[44em] text-base leading-[1.7] text-body">
            Built for the person with Down syndrome to use themselves. Tap a body outline and a
            face to say how you feel, build a sentence to tell your doctor, and see what happens
            at a visit before you go — with read-aloud on every label and a reading level that
            can drop to pictures only.
          </p>
          <div className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(min(100%,200px),1fr))]">
            {myVoiceSteps.map(([label, text]) => (
              <div key={label} className="rounded-tile bg-mist p-4">
                <p className="text-13 font-bold text-link">{label}</p>
                <p className="mt-1.5 text-sm leading-[1.55] text-body">{text}</p>
              </div>
            ))}
          </div>
          <Link to="/my-voice" className="btd-btn-coral mt-5 min-h-[46px] px-[22px] py-3 text-15">
            Open My Voice →
          </Link>
        </article>

        <article className="btd-card p-[30px]">
          <span className="btd-tag bg-butter">Always free</span>
          <h2 className="mt-3.5 mb-2 text-28 font-extrabold">Resource Navigator</h2>
          <p className="mb-[18px] max-w-[44em] text-base leading-[1.7] text-body">
            Vetted guidance from NDSS, Lettercase, NIH and peer-reviewed sources —
            filtered by where you are right now.
          </p>
          <div className="flex flex-wrap gap-2.5">
            {LIFE_STAGES.map((s) => (
              <Link
                key={s.id}
                to={`/resources?stage=${s.id}`}
                className="rounded-full border border-navy/15 bg-mist px-4 py-2.5 text-sm font-medium transition-colors hover:border-sky hover:bg-sky"
              >
                {s.label}
              </Link>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}
