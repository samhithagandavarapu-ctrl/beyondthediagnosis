import { Link } from "react-router-dom";

const features = [
  {
    to: "/assistant",
    title: "AI Advocacy Assistant",
    desc: "Ask about your rights, accommodations, or how to describe a symptom clearly. It never diagnoses — it helps you advocate.",
    tag: "Always free",
  },
  {
    to: "/appointment-prep",
    title: "Appointment Prep Tool",
    desc: "Turn symptoms, medications, and questions into a clean one-page summary you can hand straight to a provider.",
    tag: "Always free",
  },
  {
    to: "/resources",
    title: "Resource Navigator",
    desc: "Trusted resources filtered by life stage — prenatal, child, teen, adult, caregiver, or provider.",
    tag: "Always free",
  },
  {
    to: "/provider-education",
    title: "Provider Education Hub",
    desc: "Training for clinics and residency programs on diagnostic overshadowing and inclusive communication.",
    tag: "For providers",
  },
  {
    to: "/stories",
    title: "Community Stories",
    desc: "Real experiences from self-advocates, families, and clinicians — including moments advocacy changed an outcome.",
    tag: "Searchable",
  },
];

export default function Home() {
  return (
    <div>
      {/* Hero: the "spotlight" signature — a symptom sits in shadow, then advocacy brings it into light */}
      <section className="btd-container pt-16 pb-20">
        <div className="grid md:grid-cols-[1.2fr,1fr] gap-12 items-center">
          <div>
            <p className="uppercase tracking-widest text-xs font-semibold text-gold-dark mb-4">
              Healthcare advocacy for Down syndrome
            </p>
            <h1 className="text-4xl sm:text-5xl font-display font-semibold leading-[1.08] mb-6">
              Every symptom deserves a real look —
              <br className="hidden sm:block" />
              <span className="text-slate-light">not a shrug and a label.</span>
            </h1>
            <p className="text-lg text-slate max-w-xl mb-8 leading-relaxed">
              Beyond the Diagnosis helps people with Down syndrome, their families, and
              their clinicians catch what diagnostic overshadowing hides — when a real,
              treatable symptom gets waved off as "just Down syndrome."
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/assistant"
                className="btd-accent inline-flex items-center px-5 py-3 rounded bg-ink text-paper font-semibold hover:bg-slate transition-colors"
              >
                Talk to the AI Assistant
              </Link>
              <Link
                to="/appointment-prep"
                className="inline-flex items-center px-5 py-3 rounded border border-ink/20 text-ink font-semibold hover:border-ink/50 transition-colors"
              >
                Prep for an appointment
              </Link>
            </div>
          </div>

          {/* Spotlight device */}
          <div className="relative aspect-square max-w-sm mx-auto w-full">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-ink/5 to-transparent" />
            <svg viewBox="0 0 320 320" className="w-full h-full" aria-hidden="true">
              <circle cx="160" cy="160" r="150" fill="#33454E" opacity="0.06" />
              <circle cx="160" cy="160" r="105" fill="#33454E" opacity="0.09" />
              <circle cx="160" cy="160" r="62" fill="#B8912B" opacity="0.16" />
              <circle cx="160" cy="160" r="30" fill="#B8912B" />
              <text
                x="160"
                y="166"
                textAnchor="middle"
                fontFamily="'Public Sans', sans-serif"
                fontSize="11"
                fontWeight="700"
                fill="#FAF8F3"
                letterSpacing="0.5"
              >
                SEEN
              </text>
            </svg>
            <p className="text-center text-sm text-slate-light mt-2">
              What's overshadowed at the edges gets missed. We work to bring it to the
              center.
            </p>
          </div>
        </div>
      </section>

      {/* Feature grid */}
      <section className="btd-container pb-24">
        <h2 className="text-2xl font-display font-semibold mb-2">What's inside</h2>
        <p className="text-slate mb-8 max-w-2xl">
          Core tools stay free for every family who needs them — that's a mission choice
          and a business one. Revenue comes from the institutions around families, not
          from families themselves.
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f) => (
            <Link
              key={f.to}
              to={f.to}
              className="btd-card p-5 flex flex-col gap-2 hover:border-gold/60 hover:shadow-md transition-all"
            >
              <span className="text-[11px] uppercase tracking-wide font-semibold text-sage-dark">
                {f.tag}
              </span>
              <h3 className="text-lg font-display font-semibold">{f.title}</h3>
              <p className="text-sm text-slate leading-relaxed">{f.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Philosophy */}
      <section className="border-t border-ink/10 bg-ink text-paper">
        <div className="btd-container py-14 max-w-3xl">
          <p className="text-sm uppercase tracking-widest text-gold-light font-semibold mb-4">
            Our guiding principle
          </p>
          <blockquote className="text-2xl font-display leading-snug">
            "Nothing about me without me."
          </blockquote>
          <p className="text-paper/70 mt-4 text-sm">
            Built by listening directly to self-advocates and families first — not
            assumptions made on their behalf.
          </p>
        </div>
      </section>
    </div>
  );
}
