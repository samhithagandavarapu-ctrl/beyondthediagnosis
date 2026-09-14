import { Link } from "react-router-dom";
import { STORIES } from "../data/stories";
import { CTA_LABEL } from "../data/site";

const tools = [
  {
    to: "/assistant",
    title: "AI Advocacy Assistant",
    desc: "Ask about your rights, accommodations, or how to describe a symptom clearly. It never diagnoses — it helps you advocate.",
    cta: "Open the assistant →",
  },
  {
    to: "/appointment-prep",
    title: "Appointment Prep Tool",
    desc: "Turn symptoms, medications, and questions into a clean one-page summary you can hand straight to a provider.",
    cta: "Build a summary →",
  },
  {
    to: "/resources",
    title: "Resource Navigator",
    desc: "Trusted resources filtered by life stage — prenatal, child, teen, adult, caregiver, or provider.",
    cta: "Browse resources →",
  },
];

// Quote accents on the navy "problem" band, in order.
const accents = [
  { border: "border-sky", text: "text-sky" },
  { border: "border-butter", text: "text-butter" },
  { border: "border-coral", text: "text-coral" },
];

const roadmap = [
  {
    tag: "In design",
    tagBg: "bg-coral",
    title: "Billing & insurance navigation",
    desc: "Plain-language help reading an EOB, appealing a denial, and documenting medical necessity when a claim comes back wrong.",
  },
  {
    tag: "Next up",
    tagBg: "bg-butter",
    title: "Provider directory",
    desc: "Find clinicians with real experience in adult Down syndrome care — starting from the handful of specialty clinics that exist today.",
  },
  {
    tag: "Exploring",
    tagBg: "bg-sky",
    title: "Institutional licensing",
    desc: "Hospital systems and residency programs fund the platform so the family-facing tools never carry a price tag.",
  },
];

const cardGrid = "grid gap-5 mt-[34px]";

export default function Home() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-b from-mist to-sky-tint border-b border-navy/[0.08]">
        <div className="btd-container pt-[88px] pb-[76px] grid gap-10 items-end md:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          <div>
            <span className="inline-flex rounded-full bg-butter px-3.5 py-[7px] text-12 font-bold uppercase tracking-[0.12em]">
              Healthcare advocacy for Down syndrome
            </span>
            <h1 className="btd-hero-h1 mt-[22px] max-w-[16em]">
              Every symptom deserves a real look —
              <span className="text-link"> not a shrug and a label.</span>
            </h1>
            <p className="mt-6 max-w-[34em] text-[clamp(1.0625rem,1.5vw,1.3125rem)] leading-[1.6] text-body">
              Verity helps people with Down syndrome, their families, and their
              clinicians catch what diagnostic overshadowing hides — when a real,
              treatable symptom gets waved off as "just Down syndrome."
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/assistant" className="btd-btn-coral min-h-[52px] px-7 py-4 text-17">
                {CTA_LABEL}
              </Link>
              <Link
                to="/appointment-prep"
                className="btd-btn-outline min-h-[52px] px-[26px] py-3.5 text-17"
              >
                Prep for an appointment
              </Link>
            </div>
            <Link
              to="/understanding-overshadowing"
              className="mt-[26px] inline-block text-15 font-bold text-link underline underline-offset-[3px] hover:text-navy"
            >
              What is diagnostic overshadowing, exactly? →
            </Link>
          </div>

          <div className="btd-dark rounded-panel p-8 grid gap-[18px]">
            <p className="font-display text-2xl italic leading-[1.35] text-butter">
              "Nothing for me, without me."
            </p>
            <div className="h-px bg-mist/20" />
            <p className="text-15 leading-[1.65] text-mist/85">
              Core tools stay free for every family who needs them. Revenue comes from
              the institutions around families — never from families themselves.
            </p>
            <div className="flex flex-wrap gap-2.5">
              {["Never diagnoses", "Built with self-advocates"].map((t) => (
                <span key={t} className="rounded-full bg-sky px-3 py-1.5 text-12 font-bold text-navy">
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 01 — The tools */}
      <section className="btd-container pt-[76px] pb-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="btd-eyebrow">01 — The tools</span>
            <h2 className="btd-section-h2 mt-2.5">
              Everything you need before, during, and after the visit
            </h2>
          </div>
          <Link to="/tools" className="btd-btn-sky min-h-[46px] px-[22px] py-[13px] text-15">
            See all tools →
          </Link>
        </div>
        <div className={`${cardGrid} grid-cols-[repeat(auto-fit,minmax(min(100%,280px),1fr))]`}>
          {tools.map((t) => (
            <Link key={t.to} to={t.to} className="btd-card btd-card-hover p-[26px] grid gap-2.5 content-start">
              <span className="btd-tag bg-butter">Always free</span>
              <h3 className="text-23 font-bold">{t.title}</h3>
              <p className="text-15 leading-[1.65] text-body">{t.desc}</p>
              <span className="text-sm font-bold text-link">{t.cta}</span>
            </Link>
          ))}
          <Link
            to="/provider-education"
            className="btd-dark rounded-card p-[26px] grid gap-2.5 content-start transition-shadow hover:shadow-[0_10px_30px_rgba(33,50,68,0.2)]"
          >
            <span className="btd-tag bg-sky">For providers</span>
            <h3 className="text-23 font-bold">Provider Education Hub</h3>
            <p className="text-15 leading-[1.65] text-mist/85">
              Training for clinics and residency programs on diagnostic overshadowing and
              inclusive communication.
            </p>
            <span className="text-sm font-bold text-butter">See the modules →</span>
          </Link>
        </div>
      </section>

      {/* 02 — The problem */}
      <section className="btd-dark mt-[76px]">
        <div className="btd-container py-[76px]">
          <span className="btd-eyebrow text-butter">02 — The problem</span>
          <div className="mt-3 grid gap-10 items-start md:grid-cols-2">
            <div>
              <h2 className="btd-section-h2">
                A new symptom gets credited to a diagnosis someone already has.
              </h2>
              <p className="mt-4 max-w-[34em] text-17 leading-[1.7] text-mist/85">
                That's diagnostic overshadowing. A provider explains a new or worsening
                symptom by pointing at Down syndrome instead of investigating it as its own
                medical issue. Three biases drive it — anchoring, premature closure, and
                implicit bias — and research shows experience alone doesn't protect against
                it.
              </p>
              <Link
                to="/understanding-overshadowing"
                className="btd-btn-coral mt-[26px] min-h-[50px] px-[26px] py-[15px] text-base"
              >
                Read the full breakdown →
              </Link>
            </div>
            {/* Placeholder quotes from data/stories.ts — swap for consented real submissions. */}
            <div className="grid gap-4">
              {STORIES.map((s, i) => {
                const a = accents[i % accents.length];
                return (
                  <figure
                    key={s.id}
                    className={`rounded-r-2xl border-l-[3px] ${a.border} bg-mist/7 px-6 py-[22px]`}
                  >
                    <blockquote className="text-17 leading-[1.6]">"{s.excerpt}"</blockquote>
                    <figcaption
                      className={`mt-3 text-13 font-bold uppercase tracking-[0.08em] ${a.text}`}
                    >
                      {s.audience}
                    </figcaption>
                  </figure>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* 03 — Future work */}
      <section className="btd-container py-[76px]">
        <span className="btd-eyebrow">03 — Future work</span>
        <div className="mt-2.5 flex flex-wrap items-end justify-between gap-4">
          <h2 className="btd-section-h2 max-w-[22em]">
            What we're building next — and how it stays free
          </h2>
          <Link to="/future" className="btd-btn-sky min-h-[46px] px-[22px] py-[13px] text-15">
            See the roadmap →
          </Link>
        </div>
        <div className={`${cardGrid} grid-cols-[repeat(auto-fit,minmax(min(100%,250px),1fr))]`}>
          {roadmap.map((r) => (
            <div key={r.title} className="btd-card p-[26px]">
              <span className={`btd-tag ${r.tagBg}`}>{r.tag}</span>
              <h3 className="mt-3.5 mb-2 text-21 font-bold">{r.title}</h3>
              <p className="text-15 leading-[1.65] text-body">{r.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Principle band */}
      <section className="bg-sky">
        <div className="mx-auto max-w-[900px] px-6 py-[72px] text-center">
          <p className="text-12 font-bold uppercase tracking-[0.14em] text-sky-ink">
            Our guiding principle
          </p>
          <blockquote className="mt-[18px] font-display text-[clamp(1.75rem,4vw,2.875rem)] leading-[1.2] tracking-[-0.02em]">
            "Nothing for me, without me."
          </blockquote>
          <p className="mx-auto mt-[18px] max-w-[46em] text-base leading-[1.7] text-sky-ink">
            Built by listening directly to self-advocates and families first — not
            assumptions made on their behalf.
          </p>
          <Link to="/assistant" className="btd-btn-coral mt-[30px] min-h-[52px] px-[30px] py-4 text-17">
            {CTA_LABEL}
          </Link>
        </div>
      </section>
    </div>
  );
}
