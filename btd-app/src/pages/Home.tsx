import { Link } from "react-router-dom";
import { CTA_LABEL } from "../data/site";
import { useSiteSettings } from "../context/SiteSettingsContext";
import { isExternalLink } from "../lib/siteSettings";
import Reveal from "../components/Reveal";
import Scribble from "../components/Scribble";
import { useAccountMode } from "../context/AccountModeContext";
import { FamilyDashboard, SelfHome } from "../components/home/AccountHomes";

const audiences = [
  {
    to: "/my-voice",
    title: "I'm here for me",
    desc: "Say how you feel, practice your visit, and tell your doctor in your own words.",
    cta: "Open My Voice",
  },
  {
    to: "/appointment-prep",
    title: "I'm a parent or caregiver",
    desc: "Get ready for appointments, track symptoms, and speak up when something gets brushed off.",
    cta: "Prep for an appointment",
  },
  {
    to: "/provider-education",
    title: "I'm a provider",
    desc: "Learn how diagnostic overshadowing shows up in practice, and help us shape provider training.",
    cta: "For providers",
  },
];

const toolGroups = [
  {
    label: "For self-advocates",
    tools: [
      {
        to: "/my-voice",
        title: "My Voice",
        desc: "Tap how you feel and build what you want to tell your doctor.",
        cta: "Open My Voice →",
      },
      {
        to: "/my-voice/practice",
        title: "Practice My Visit",
        desc: "See what happens at a doctor's visit, step by step, before you go.",
        cta: "Practice a visit →",
      },
      {
        to: "/calendar",
        title: "My Calendar",
        desc: "Track how you feel each day: pain, sleep, your period, and more.",
        cta: "Open my calendar →",
      },
    ],
  },
  {
    label: "For families and caregivers",
    tools: [
      {
        to: "/appointment-prep",
        title: "Appointment Prep",
        desc: "Turn symptoms, medications, and questions into a one-page summary for the provider.",
        cta: "Build a summary →",
      },
      {
        to: "/assistant",
        title: "AI Advocate",
        desc: "Ask about your rights or how to describe a symptom. It never diagnoses — it helps you advocate.",
        cta: "Open the assistant →",
      },
      {
        to: "/resources",
        title: "Resources",
        desc: "Trusted resources filtered by life stage, from prenatal to adult and caregiver.",
        cta: "Browse resources →",
      },
    ],
  },
];

// The headline sets down a word at a time; "label." gets underlined last.
const RISE_STEP = 70; // ms between words
const headline = "Every symptom deserves a real look,".split(" ");
const headlineTurn = "not a shrug and a".split(" ");
const turnDelay = (i: number) => (headline.length + i) * RISE_STEP + 250;
const labelDelay = turnDelay(headlineTurn.length);

export default function Home() {
  // Signed in as a parent or a self-advocate: their own home. Everyone else
  // gets the page about Voiced.
  const { view, mode } = useAccountMode();
  const { survey } = useSiteSettings().settings;
  if (view === "self") return <SelfHome />;
  if (mode === "parent") return <FamilyDashboard />;
  return (
    <div>
      {/* Hero */}
      <section className="btd-grain bg-gradient-to-b from-mist to-sky-tint border-b border-navy/[0.08]">
        <div className="btd-container pt-10 pb-[76px]">
          <div>
            <h1 className="btd-hero-h1 max-w-[18em] !text-[clamp(2.125rem,4.4vw,3.5rem)] !leading-[1.06]">
              {headline.map((w, i) => (
                <span key={i}>
                  <span className="btd-rise" style={{ animationDelay: `${i * RISE_STEP}ms` }}>
                    {w}
                  </span>{" "}
                </span>
              ))}
              <span className="text-link">
                {headlineTurn.map((w, i) => (
                  <span key={i}>
                    <span className="btd-rise" style={{ animationDelay: `${turnDelay(i)}ms` }}>
                      {w}
                    </span>{" "}
                  </span>
                ))}
                <span className="btd-rise" style={{ animationDelay: `${labelDelay}ms` }}>
                  <Scribble delay={labelDelay + 450} className="text-link [&_svg]:text-sky">
                    label.
                  </Scribble>
                </span>
              </span>
            </h1>
            <p className="mt-8 max-w-[34em] text-[clamp(1.0625rem,1.5vw,1.3125rem)] leading-[1.6] text-body">
              Voiced helps people with Down syndrome, their families, and their
              clinicians catch what diagnostic overshadowing hides: when a real,
              treatable symptom gets waved off as{" "}
              <Scribble kind="circle" delay={labelDelay + 1300} className="[&_svg]:text-coral/70">
                "just Down syndrome."
              </Scribble>
            </p>
            <h2 className="mt-10 font-display text-23 font-extrabold text-navy">
              Who is Voiced for today?
            </h2>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              {audiences.map((a, i) => (
                <Link
                  key={a.to}
                  to={a.to}
                  className={`btd-card btd-lift ${
                    i === 0
                      ? "btd-lift-butter border-2 border-navy bg-coral"
                      : `btd-lift-${["sky", "coral", "butter"][i % 3]}`
                  } grid min-h-[44px] content-start gap-2.5 p-6`}
                >
                  <h3 className="text-23 font-bold">{a.title}</h3>
                  <p className={`text-15 leading-[1.65] ${i === 0 ? "text-coral-ink" : "text-body"}`}>
                    {a.desc}
                  </p>
                  <span className={`text-sm font-bold ${i === 0 ? "text-navy underline underline-offset-[3px]" : "text-link"}`}>
                    {a.cta} <span className="btd-arrow">→</span>
                  </span>
                </Link>
              ))}
            </div>
            <Link
              to="/understanding-overshadowing"
              className="mt-[26px] inline-block text-15 font-bold text-link underline underline-offset-[3px] hover:text-navy"
            >
              What is diagnostic overshadowing, exactly? →
            </Link>
          </div>
        </div>
      </section>

      {/* The tools */}
      <section className="btd-container pt-[76px] pb-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="btd-section-h2">
              Everything you need before, during, and after the visit
            </h2>
            <p className="mt-3 text-17 leading-[1.6] text-body">
              All core tools are always free for families.
            </p>
          </div>
        </div>
        {toolGroups.map((g) => (
          <div key={g.label}>
            <h3 className="mt-[34px] btd-eyebrow">{g.label}</h3>
            <div className="grid gap-5 mt-4 md:grid-cols-3">
              {g.tools.map((t, i) => (
                <Link
                  key={t.to}
                  to={t.to}
                  className={`btd-card btd-lift btd-lift-${["sky", "coral", "butter"][i % 3]} p-[26px] grid gap-2.5 content-start`}
                >
                  <h4 className="text-23 font-bold">{t.title}</h4>
                  <p className="text-15 leading-[1.65] text-body">{t.desc}</p>
                  <span className="text-sm font-bold text-link">
                    {t.cta.replace(/ →$/, "")} <span className="btd-arrow">→</span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* Community line */}
      <section className="btd-container pt-[52px] text-center">
        <p className="text-17 leading-[1.6] text-body">
          Shaped by families we met at the 2026 NCDSA Buddy Walk.{" "}
          <Link
            to="/mission"
            className="font-bold text-link underline underline-offset-[3px] hover:text-navy"
          >
            Read our story →
          </Link>
        </p>
      </section>

      {/* Event survey banner (admins change it at /admin/site) */}
      {survey.on && (
      <section className="btd-container pt-8">
        <div className="btd-event-banner flex flex-wrap items-center justify-between gap-4 rounded-card border-2 border-navy bg-butter px-6 py-5">
          <div className="max-w-[40em]">
            <p className="font-display text-21 font-extrabold leading-tight text-navy">{survey.title}</p>
            <p className="mt-1 text-15 leading-[1.6] text-butter-ink">{survey.text}</p>
          </div>
          {isExternalLink(survey.url) ? (
            <a
              href={survey.url}
              target="_blank"
              rel="noopener noreferrer"
              className="btd-btn min-h-[52px] bg-navy px-7 py-3.5 text-17 text-mist hover:bg-navy/90"
            >
              {survey.button} →
            </a>
          ) : (
            <Link to={survey.url} className="btd-btn min-h-[52px] bg-navy px-7 py-3.5 text-17 text-mist hover:bg-navy/90">
              {survey.button} →
            </Link>
          )}
        </div>
      </section>
      )}

      {/* The problem */}
      <section className="btd-dark mt-[76px]">
        <div className="btd-container py-[76px]">
          <div className="grid gap-10 items-start md:grid-cols-2">
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
            <div className="rounded-r-2xl border-l-[3px] border-sky bg-mist/7 px-6 py-[22px]">
              <p className="text-15 font-bold text-mist/85">What it can look like:</p>
              <ul className="mt-3 grid gap-2.5 text-15 leading-[1.6]">
                <li>A change in mood or behavior that turns out to be pain, hearing loss, or a thyroid problem.</li>
                <li>New forgetfulness in a young adult assumed to be Alzheimer's, when the real cause may be treatable.</li>
                <li>Tiredness or sleep trouble written off as "part of Down syndrome."</li>
              </ul>
              <p className="mt-4 text-sm text-mist/85">Has this happened to you or someone you love?</p>
              <Link
                to="/stories#share"
                className="mt-1 inline-block text-sm font-bold text-sky underline underline-offset-[3px] hover:text-mist"
              >
                Share your story →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Principle band */}
      <section className="btd-grain bg-sky">
        <Reveal className="mx-auto max-w-[900px] px-6 py-[72px] text-center">
          <p className="text-12 font-bold uppercase tracking-[0.14em] text-sky-ink">
            Our guiding principle
          </p>
          <blockquote className="mt-[18px] font-display text-[clamp(1.75rem,4vw,2.875rem)] leading-[1.2] tracking-[-0.02em]">
            {["\"Nothing", "for", "me,"].map((w, i) => (
              <span key={i}>
                <span className="btd-quote-word" style={{ transitionDelay: `${200 + i * 150}ms` }}>
                  {w}
                </span>{" "}
              </span>
            ))}
            <span className="btd-quote-word" style={{ transitionDelay: "650ms" }}>
              <Scribble onReveal delay={1000} className="[&_svg]:text-white">
                without me."
              </Scribble>
            </span>
          </blockquote>
          <p className="mx-auto mt-[18px] max-w-[46em] text-base leading-[1.7] text-sky-ink">
            Built by listening directly to self-advocates and families first — not
            assumptions made on their behalf.
          </p>
          <Link to="/assistant" className="btd-btn-coral mt-[30px] min-h-[52px] px-[30px] py-4 text-17">
            {CTA_LABEL}
          </Link>
        </Reveal>
      </section>
    </div>
  );
}
