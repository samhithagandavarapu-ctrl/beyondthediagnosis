import { Link, useSearchParams } from "react-router-dom";
import { CTA_LABEL } from "../data/site";
import { useSiteSettings } from "../context/SiteSettingsContext";
import { isExternalLink } from "../lib/siteSettings";
import Scribble from "../components/Scribble";
import { useAccountMode } from "../context/AccountModeContext";
import { FamilyDashboard, SelfHome } from "../components/home/AccountHomes";
import Icon, { type IconName } from "../components/icons/Icon";

// A peek at the My Voice check-in on the "I'm here for me" card.
const previewFaces: IconName[] = ["face-great", "face-good", "face-okay", "face-bad"];

// "What's inside": the main tools, by name only.
const insideTools: { to: string; label: string; icon: IconName }[] = [
  { to: "/my-voice", label: "My Voice", icon: "hub-feelings" },
  { to: "/appointment-prep", label: "Appointment Prep", icon: "clipboard" },
  { to: "/calendar", label: "My Calendar", icon: "calendar" },
  { to: "/assistant", label: "AI Advocate", icon: "chat" },
];

// The two smaller doors next to "I'm here for me". On phones all three doors
// are the same size; the parent one gets a light blue fill.
const otherAudiences = [
  { to: "/appointment-prep", title: "I'm a parent or caregiver", phone: "border-sky bg-sky-tint" },
  { to: "/provider-education", title: "I'm a provider", phone: "border-navy/12" },
];
// ?for=parents (the parents ad) makes the parent door stand out.
const parentHighlight = "!rounded-card !border-[3px] !border-link !bg-sky/50 md:px-4";

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
  const forParents = useSearchParams()[0].get("for") === "parents";
  if (view === "self") return <SelfHome />;
  if (mode === "parent") return <FamilyDashboard />;
  return (
    <div>
      {/* Hero */}
      <section className="btd-grain bg-gradient-to-b from-mist to-sky-tint border-b border-navy/[0.08]">
        <div className="mx-auto w-full max-w-[1200px] px-6 pt-10 pb-[76px]">
          {/* Headline next to a real photo from camp. On phones the photo
              sits right under the headline. */}
          <div className="grid items-center gap-10 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] md:gap-14">
            <div>
              <h1 className="btd-hero-h1 max-w-[16em] !text-[clamp(2rem,3.7vw,3.125rem)] !leading-[1.1]">
                Free tools that help people with Down syndrome get their symptoms{" "}
                <span className="text-link">taken seriously.</span>
              </h1>
              <p className="mt-5 max-w-[32em] text-[clamp(1.0625rem,1.5vw,1.3125rem)] leading-[1.6] text-body">
                Every symptom deserves a real look, not a shrug and a label.
              </p>
            </div>
            <figure className="btd-snapshot btd-card mx-auto w-full max-w-[300px] bg-white !pb-[22px] md:mt-2 md:max-w-[420px]">
              <div className="relative aspect-square overflow-hidden rounded-lg md:aspect-[4/5]">
                <img
                  src="/images/samhitha-camp-floor.jpg"
                  alt="Samhitha sitting on a gym floor next to a young camper in a blue shirt, with kids playing with a rainbow parachute behind them"
                  width={1200}
                  height={1500}
                  fetchPriority="high"
                  className="absolute inset-0 h-full w-full object-cover object-[center_80%]"
                />
              </div>
            </figure>
          </div>
          <div>
            <h2 className="mt-10 font-display text-23 font-extrabold text-navy">
              Who is Voiced for today?
            </h2>
            {/* 60/40 on wider screens, both columns the same height; one
                column on phones. */}
            <div className="mt-4 grid gap-4 md:grid-cols-[3fr_2fr] md:gap-8">
              <Link
                to="/my-voice"
                data-calm-avoid
                className="btd-lift flex min-h-[70px] items-center justify-between gap-3 rounded-card border border-navy/12 bg-butter px-5 py-3 text-navy md:min-h-[180px] md:flex-col md:items-stretch md:justify-center md:gap-4 md:p-8"
              >
                <span className="font-display text-21 font-extrabold leading-tight md:text-[clamp(1.75rem,3vw,2.375rem)]">
                  I'm here for me
                  <span className="hidden md:inline">
                    {" "}<span className="btd-arrow">→</span>
                  </span>
                </span>
                {/* Phones: the arrow sits on the right, like the other doors. */}
                <span aria-hidden="true" className="text-21 font-bold md:hidden">
                  <span className="btd-arrow">→</span>
                </span>
                {/* Decoration only: the link reads as "I'm here for me". */}
                <span aria-hidden="true" className="hidden gap-2.5 md:flex">
                  {previewFaces.map((face) => (
                    <span key={face} className="grid h-12 w-12 place-items-center rounded-full bg-white">
                      <Icon name={face} size={30} />
                    </span>
                  ))}
                </span>
              </Link>
              <ul className="grid gap-4 md:grid-rows-2 md:gap-0 md:divide-y md:divide-navy/12 md:border-y md:border-navy/12">
                {otherAudiences.map((a) => (
                  <li key={a.to} className="flex">
                    <Link
                      to={a.to}
                      data-calm-avoid
                      className={`group flex min-h-[70px] flex-1 items-center justify-between gap-3 rounded-card border px-5 py-3 text-21 font-bold text-navy hover:text-link md:min-h-[64px] md:rounded-none md:border-0 md:bg-transparent md:px-0 md:py-4 ${a.phone} ${
                        forParents && a.to === "/appointment-prep" ? parentHighlight : ""
                      }`}
                    >
                      {a.title}
                      <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">→</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <h2 id="inside-heading" className="mt-12 font-display text-23 font-extrabold text-navy">
              What's inside
            </h2>
            <ul aria-labelledby="inside-heading" className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
              {insideTools.map((t) => (
                <li key={t.to}>
                  <Link
                    to={t.to}
                    className="flex h-full min-h-[64px] items-center gap-3 rounded-tile border border-sky bg-white px-4 py-3 text-15 font-bold text-navy transition-colors hover:bg-sky-tint"
                  >
                    <Icon name={t.icon} size={24} className="shrink-0" />
                    {t.label}
                  </Link>
                </li>
              ))}
            </ul>
            <Link
              to="/understanding-overshadowing"
              className="mt-8 inline-block text-15 font-bold text-link underline underline-offset-[3px] hover:text-navy"
            >
              What is diagnostic overshadowing, exactly? →
            </Link>
          </div>
        </div>
      </section>

      {/* Workshops announcement. Take this out (or change it) once dates are set. */}
      <section aria-labelledby="workshops-heading" className="mx-auto w-full max-w-[1200px] px-6 pt-[52px]">
        <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-4 rounded-card border-2 border-navy bg-sky px-6 py-6 sm:px-8">
          <div className="max-w-[44em]">
            <p className="text-12 font-bold uppercase tracking-[0.14em] text-sky-ink">First workshop</p>
            <h2 id="workshops-heading" className="mt-1.5 font-display text-23 font-extrabold text-navy">
              My Body, My Voice: Black Friday Shop &amp; Play Camp
            </h2>
            <p className="mt-2 text-17 leading-[1.6] text-sky-ink">
              A drop-off camp where kids build body awareness, healthy habits, and
              self-advocacy through play. Friday, Nov. 27 at We Rock the Spectrum Kid's Gym,
              Durham. Morning (9–12) $45 · Extended (9–2) $65 · All day (9–4) $85. Co-hosted
              with HabitSprouts.
            </p>
          </div>
          <a
            href="https://ecom.roller.app/werockthespectrumdurham/camps/en-us/product/2150603?date=2026-11-27"
            target="_blank"
            rel="noopener noreferrer"
            className="btd-btn-outline min-h-[48px] w-full shrink-0 bg-white px-6 text-center text-15 md:w-auto"
          >
            Reserve a spot →
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
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
