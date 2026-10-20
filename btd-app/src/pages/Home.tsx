import { Link } from "react-router-dom";
import { CTA_LABEL, CTA_TO, SURVEY_URL } from "../data/site";
import Reveal from "../components/Reveal";
import Scribble from "../components/Scribble";

// My Voice leads the page on its own; these are the tools for the grown-ups
// around the visit.
const myVoiceSteps = [
  ["Show how you feel", "Tap where it hurts and pick a face. No reading needed."],
  ["Tell my doctor", "Taps become a sentence you can say out loud or print."],
  ["Practice the visit", "A picture walkthrough, from arriving to all done."],
];

const tools = [
  {
    to: "/appointment-prep",
    title: "Appointment Prep Tool",
    desc: "Turn symptoms, medications, and questions into a clean one-page summary you can hand straight to a provider.",
    cta: "Build a summary →",
  },
  {
    to: "/assistant",
    title: "AI Advocacy Assistant",
    desc: "Ask about your rights, accommodations, or how to describe a symptom clearly. It never diagnoses — it helps you advocate.",
    cta: "Open the assistant →",
  },
  {
    to: "/resources",
    title: "Resource Navigator",
    desc: "Trusted resources filtered by life stage — prenatal, child, teen, adult, caregiver, or provider.",
    cta: "Browse resources →",
  },
];

const cardGrid = "grid gap-5 mt-[34px]";

// The headline sets down a word at a time; "label." gets underlined last.
const RISE_STEP = 70; // ms between words
const headline = "Every symptom deserves a real look,".split(" ");
const headlineTurn = "not a shrug and a".split(" ");
const turnDelay = (i: number) => (headline.length + i) * RISE_STEP + 250;
const labelDelay = turnDelay(headlineTurn.length);

export default function Home() {
  return (
    <div>
      {/* Hero */}
      <section className="btd-grain bg-gradient-to-b from-mist to-sky-tint border-b border-navy/[0.08]">
        <div className="btd-container pt-10 pb-16">
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
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to={CTA_TO} className="btd-btn-coral min-h-[52px] px-7 py-4 text-17">
                {CTA_LABEL}
              </Link>
              <a href="#tools" className="btd-btn-outline min-h-[52px] px-[26px] py-3.5 text-17">
                See all the tools
              </a>
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

      {/* The tools: the heart of the site, straight after the hero. */}
      <section id="tools" className="btd-container scroll-mt-24 pt-16 pb-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="btd-section-h2">
              Everything you need before, during, and after the visit
            </h2>
            <p className="mt-3 text-17 leading-[1.6] text-body">
              All core tools are always free for families.
            </p>
          </div>
          <Link to="/tools" className="btd-btn-sky min-h-[46px] px-[22px] py-[13px] text-15">
            See all tools →
          </Link>
        </div>

        <article className="btd-card mt-[34px] grid gap-6 border-2 border-navy p-[30px] md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] md:items-center">
          <div>
            <span className="btd-tag bg-sky">Made for kids and self-advocates</span>
            <h3 className="mt-3.5 font-display text-[clamp(1.75rem,3.4vw,2.375rem)] font-extrabold leading-[1.1] text-navy">
              My Voice
            </h3>
            <p className="mt-3 max-w-[34em] text-17 leading-[1.7] text-body">
              Built for the person with Down syndrome to use themselves. Say how you feel
              with pictures and taps, then tell the doctor in your own words. Every label
              can be read aloud.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/my-voice" className="btd-btn-coral min-h-[52px] px-7 py-4 text-17">
                Open My Voice →
              </Link>
              <Link
                to="/my-voice/practice"
                className="btd-btn-outline min-h-[52px] px-[26px] py-3.5 text-17"
              >
                Practice My Visit
              </Link>
            </div>
          </div>
          <ol className="grid gap-3">
            {myVoiceSteps.map(([label, text]) => (
              <li key={label} className="rounded-tile bg-mist p-4">
                <p className="text-15 font-bold text-link">{label}</p>
                <p className="mt-1 text-15 leading-[1.55] text-body">{text}</p>
              </li>
            ))}
          </ol>
        </article>

        <div className={`${cardGrid} md:grid-cols-3`}>
          {tools.map((t, i) => (
            <Link
              key={t.to}
              to={t.to}
              className={`btd-card btd-lift btd-lift-${["sky", "coral", "butter"][i % 3]} p-[26px] grid gap-2.5 content-start`}
            >
              <h3 className="text-23 font-bold">{t.title}</h3>
              <p className="text-15 leading-[1.65] text-body">{t.desc}</p>
              <span className="text-sm font-bold text-link">
                {t.cta.replace(/ →$/, "")} <span className="btd-arrow">→</span>
              </span>
            </Link>
          ))}
        </div>

        {/* Event banner: after the tools, for people who met us in person. */}
        <div className="btd-event-banner mt-12 flex flex-wrap items-center justify-between gap-4 rounded-card border-2 border-navy bg-butter px-6 py-5">
          <div className="max-w-[40em]">
            <p className="font-display text-21 font-extrabold leading-tight text-navy">
              Met us at an event? Help shape Voiced.
            </p>
            <p className="mt-1 text-15 leading-[1.6] text-butter-ink">
              Tell us what would help you, your family, or your patients. It's a short
              survey and takes just a few minutes.
            </p>
          </div>
          <a
            href={SURVEY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btd-btn min-h-[52px] bg-navy px-7 py-3.5 text-17 text-mist hover:bg-navy/90"
          >
            Take the survey →
          </a>
        </div>
      </section>

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
          <Link to={CTA_TO} className="btd-btn-coral mt-[30px] min-h-[52px] px-[30px] py-4 text-17">
            {CTA_LABEL}
          </Link>
        </Reveal>
      </section>
    </div>
  );
}
