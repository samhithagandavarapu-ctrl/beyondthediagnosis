import { Link } from "react-router-dom";
import { CTA_LABEL } from "../data/site";
import { useSiteSettings } from "../context/SiteSettingsContext";
import { isExternalLink } from "../lib/siteSettings";
import Scribble from "../components/Scribble";
import { useAccountMode } from "../context/AccountModeContext";
import { FamilyDashboard, SelfHome } from "../components/home/AccountHomes";

// The two smaller doors next to "I'm here for me".
const otherAudiences = [
  { to: "/appointment-prep", title: "I'm a parent or caregiver" },
  { to: "/provider-education", title: "I'm a provider" },
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
        <div className="mx-auto w-full max-w-[1200px] px-6 pt-10 pb-[76px]">
          <div>
            <h1 className="btd-hero-h1 max-w-[18em] !text-[clamp(2.125rem,4.4vw,3.5rem)] !leading-[1.06]">
              Every symptom deserves a real look,{" "}
              <span className="text-link">not a shrug and a label.</span>
            </h1>
            <p className="mt-6 max-w-[34em] text-[clamp(1.0625rem,1.5vw,1.3125rem)] leading-[1.6] text-body">
              Tools to help people with Down syndrome get their symptoms taken seriously.
            </p>
            <h2 className="mt-10 font-display text-23 font-extrabold text-navy">
              Who is Voiced for today?
            </h2>
            {/* 60/40 on wider screens, both columns the same height; one
                column on phones. */}
            <div className="mt-4 grid gap-4 md:grid-cols-[3fr_2fr] md:gap-8">
              {/* A real photo of a self-advocate could go in this block later. */}
              <Link
                to="/my-voice"
                className="btd-dark btd-lift flex min-h-[180px] items-center rounded-card p-6 sm:p-8"
              >
                <span className="font-display text-[clamp(1.75rem,3vw,2.375rem)] font-extrabold leading-tight">
                  I'm here for me <span className="btd-arrow">→</span>
                </span>
              </Link>
              <ul className="grid grid-rows-2 divide-y divide-navy/12 border-y border-navy/12">
                {otherAudiences.map((a) => (
                  <li key={a.to} className="flex">
                    <Link
                      to={a.to}
                      className="group flex min-h-[64px] flex-1 items-center justify-between gap-3 py-4 text-21 font-bold text-navy hover:text-link"
                    >
                      {a.title}
                      <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">→</span>
                    </Link>
                  </li>
                ))}
              </ul>
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
      <section className="mx-auto w-full max-w-[1200px] px-6 pt-[76px] pb-6">
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
              {g.tools.map((t) => (
                <Link
                  key={t.to}
                  to={t.to}
                  className="btd-card btd-lift p-[26px] grid gap-2.5 content-start"
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
      <section className="mx-auto w-full max-w-[1200px] px-6 pt-[52px] text-center">
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
      <section className="mx-auto w-full max-w-[1200px] px-6 pt-8">
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
        <div className="mx-auto w-full max-w-[1200px] px-6 py-[76px]">
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
                className="btd-btn btd-accent mt-[26px] min-h-[50px] border-2 border-mist px-[26px] py-[15px] text-base text-mist hover:bg-mist hover:text-navy"
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
        <div className="mx-auto max-w-[900px] px-6 py-[72px] text-center">
          <p className="text-12 font-bold uppercase tracking-[0.14em] text-sky-ink">
            Our guiding principle
          </p>
          <blockquote className="mt-[18px] font-display text-[clamp(1.75rem,4vw,2.875rem)] leading-[1.2] tracking-[-0.02em]">
            "Nothing for me,{" "}
            <Scribble className="[&_svg]:text-white">without me."</Scribble>
          </blockquote>
          <p className="mx-auto mt-[18px] max-w-[46em] text-base leading-[1.7] text-sky-ink">
            Built by listening directly to self-advocates and families first — not
            assumptions made on their behalf.
          </p>
          <Link to="/assistant" className="btd-btn btd-accent mt-[30px] min-h-[52px] bg-navy px-[30px] py-4 text-17 text-mist hover:bg-navy/90">
            {CTA_LABEL}
          </Link>
        </div>
      </section>
    </div>
  );
}
