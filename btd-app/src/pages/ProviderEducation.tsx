import { Link } from "react-router-dom";
import PageHero from "../components/PageHero";
import { RESOURCES } from "../data/resources";

// The same links the Resources page gives clinicians, so the two never drift.
const resourceLink = (id: string) => RESOURCES.find((r) => r.id === id)?.link ?? "/resources";

const startHere = [
  {
    to: "/understanding-overshadowing",
    title: "Understanding diagnostic overshadowing",
    desc: "What it is, the biases behind it, and how it shows up in a visit.",
  },
  {
    href: resourceLink("r10"),
    title: "Patient education tools for clinicians",
    desc: "CARE Down Syndrome's materials for caring for adults with Down syndrome.",
  },
  {
    href: resourceLink("r11"),
    title: "Pain assessment in patients with intellectual disabilities",
    desc: "IASP's fact sheet on why pain is missed and how to adjust assessment.",
  },
];

const modules = [
  {
    title: "Recognizing diagnostic overshadowing",
    desc: "How the bias shows up in practice, with real clinical patterns — from behavioral symptoms mistaken for 'just DS functioning' to age-of-onset mistakes with conditions like Alzheimer's.",
  },
  {
    title: "Inclusive communication for intellectual disability",
    desc: "Addressing the patient directly, adapting communication style without infantilizing, and involving caregivers appropriately rather than exclusively.",
  },
  {
    title: "Pain and symptom assessment across the lifespan",
    desc: "Why pain is under-recognized in patients with intellectual disabilities, and practical adjustments to standard assessment tools.",
  },
  {
    title: "Full certificate track",
    desc: "All modules plus a capstone case-review session, designed for residency programs and hospital systems.",
  },
];

export default function ProviderEducation() {
  return (
    <div>
      <PageHero
        tone="navy"
        eyebrow="For providers"
        title="Provider Education Hub"
        lede="Training on diagnostic overshadowing and inclusive care for patients with Down syndrome, built with specialists and families. We're developing these modules now and looking for clinics and residency programs to help shape them."
      />
      <section className="btd-container pt-12 pb-20 grid gap-5">
        <h2 className="text-lg font-bold text-muted">Start here now</h2>
        <div className="grid gap-5 md:grid-cols-3">
          {startHere.map((c, i) => {
            const className = `btd-card btd-lift btd-lift-${["sky", "coral", "butter"][i % 3]} p-[26px] grid gap-2.5 content-start`;
            const body = (
              <>
                <h3 className="text-21 font-bold">{c.title}</h3>
                <p className="text-15 leading-[1.65] text-body">{c.desc}</p>
                <span className="text-sm font-bold text-link">
                  {c.to ? (
                    <>
                      Read the breakdown <span className="btd-arrow">→</span>
                    </>
                  ) : (
                    <>
                      Visit resource <span aria-hidden="true">↗</span>
                      <span className="sr-only"> (opens in a new tab)</span>
                    </>
                  )}
                </span>
              </>
            );
            return c.to ? (
              <Link key={c.title} to={c.to} className={className}>
                {body}
              </Link>
            ) : (
              <a key={c.title} href={c.href} target="_blank" rel="noopener noreferrer" className={className}>
                {body}
              </a>
            );
          })}
        </div>

        <h2 className="mt-7 text-lg font-bold text-muted">Planned modules</h2>

        {modules.map((m) => (
          <article key={m.title} className="btd-card p-[26px]">
            <div className="max-w-[44em]">
              <h3 className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-23 font-bold">
                {m.title}
                <span className="btd-tag bg-butter">Coming soon</span>
              </h3>
              <p className="text-15 leading-[1.7] text-body">{m.desc}</p>
            </div>
          </article>
        ))}

        <div className="btd-dark rounded-card p-[30px]">
          <h2 className="mb-2 text-26 font-extrabold">For hospitals and residency programs</h2>
          <p className="mb-[18px] max-w-[44em] text-base leading-[1.7] text-mist/85">
            Interested in piloting this training with your staff or trainees? We'd love to
            build it with you.
          </p>
          <a
            href="mailto:withvoiced@gmail.com?subject=Provider%20Education%20pilot"
            className="btd-btn-coral min-h-[50px] px-6 py-[15px] text-base"
          >
            Talk about a pilot →
          </a>
        </div>
        <p className="text-15 leading-[1.6] text-body">
          Want to know when modules launch? Email us at{" "}
          <a
            href="mailto:withvoiced@gmail.com?subject=Tell%20me%20when%20modules%20launch"
            className="font-bold text-link underline underline-offset-[3px] hover:text-navy"
          >
            withvoiced@gmail.com
          </a>
        </p>
      </section>
    </div>
  );
}
