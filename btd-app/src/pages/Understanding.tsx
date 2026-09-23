import { Link } from "react-router-dom";
import PageHero from "../components/PageHero";

const biases = [
  ["Anchoring bias", "latching onto one piece of information (the Down syndrome diagnosis) and letting it dominate the whole assessment."],
  ["Premature closure", "stopping the workup before all the relevant information has been gathered."],
  ["Implicit bias", "unconscious assumptions about a patient that quietly shape judgment without the clinician noticing."],
];

const hotspots = [
  ["Mental and behavioral health", "When a physical symptom is hard to describe in words, it often surfaces as a behavior change — then gets treated as \"just how they are.\""],
  ["Alzheimer's disease", "Risk is higher and onset earlier, but true symptoms are rare before 40. Changes in younger adults get assumed to be Alzheimer's when the real cause may be treatable."],
  ["Differences treated as fixed", "Immune or kidney differences get treated as unchangeable facts rather than things to actively manage — consistent hydration, for one, meaningfully helps."],
  ["Autism", "More common alongside Down syndrome than in the general population, but overlapping traits make it easy to miss — delaying therapies that help."],
  ["Even after death", "Death-certificate research finds Down syndrome is more likely to be listed as the cause on its own, with less investigation of other contributing factors."],
];

const sources = [
  ["https://careds.org/article/diagnostic-overshadowing/", "\"Avoiding Diagnostic Overshadowing when Caring for Adults with Down Syndrome\" — CARE Down Syndrome (NDSS)"],
  ["https://www.ncdsalliance.org/healthcareinformation/", "Healthcare Information for Families & Caregivers — NC Down Syndrome Alliance"],
];

const bodyText = "text-base leading-[1.75] text-body";

export default function Understanding() {
  return (
    <div>
      <PageHero
        tone="navy"
        eyebrow="The problem"
        title="Understanding diagnostic overshadowing"
        lede="A plain-language guide to the pattern this platform exists to fight — drawn from clinical sources at CARE Down Syndrome, an initiative of the National Down Syndrome Society."
      />
      <section className="btd-container pt-14 pb-20 grid gap-6 items-start md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="grid gap-7">
          <div>
            <h2 className="mb-2.5 text-30 font-extrabold">What it is</h2>
            <p className={`${bodyText} mb-3`}>
              Diagnostic overshadowing happens when a provider explains a new or worsening
              symptom by pointing to a diagnosis the person already has — Down syndrome —
              instead of investigating it as its own, possibly unrelated, medical issue. The
              Joint Commission's definition centers on exactly this. The idea dates to
              research from the early 1980s on how symptoms in people with intellectual
              disabilities got folded into that diagnosis instead of recognized as distinct.
            </p>
            <p className={bodyText}>
              It isn't unique to Down syndrome — the same pattern appears in care for people
              with other intellectual and developmental disabilities, mental illness, and
              movement disorders. But because Down syndrome is so recognizable, it's an
              especially easy target for the shortcut.
            </p>
          </div>

          <div>
            <h2 className="mb-2.5 text-30 font-extrabold">Why it happens — three biases</h2>
            <div className="grid gap-3">
              {biases.map(([term, text]) => (
                <div
                  key={term}
                  className="btd-surface rounded-r-lg border border-navy/12 border-l-4 border-l-coral px-5 py-[18px]"
                >
                  <p className="text-base leading-[1.65] text-body">
                    <strong className="text-navy">{term}</strong> — {text}
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-3.5 text-15 leading-[1.7] text-muted">
              Research cited by CARE Down Syndrome found the clinicians most prone to this
              bias were split between the least and the most experienced — seasoned
              providers aren't automatically protected.
            </p>
          </div>

          <div>
            <h2 className="mb-3.5 text-30 font-extrabold">Where it shows up most</h2>
            <div className="grid gap-[18px] grid-cols-[repeat(auto-fit,minmax(min(100%,260px),1fr))]">
              {hotspots.map(([title, text]) => (
                <div key={title}>
                  <h3 className="mb-1.5 text-lg font-bold">{title}</h3>
                  <p className="text-15 leading-[1.65] text-body">{text}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="mb-3 text-[1.375rem] font-bold">Sources</h2>
            <ul className="list-disc pl-5 grid gap-2 text-15 leading-[1.6]">
              {sources.map(([href, label]) => (
                <li key={href}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-link hover:text-navy hover:underline"
                  >
                    {label} ↗
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <aside className="grid gap-4 md:sticky md:top-24">
          <div className="rounded-card bg-sky p-6">
            <p className="mb-2.5 text-12 font-bold uppercase tracking-[0.12em] text-sky-ink">
              Community stories
            </p>
            <p className="text-base leading-[1.6]">
              Real experiences from self-advocates, families, and clinicians — including
              moments where advocacy changed an outcome.
            </p>
            <Link to="/stories" className="btd-btn mt-4 min-h-[46px] bg-white px-5 py-[13px] text-15">
              Read the stories →
            </Link>
          </div>
          <figure className="btd-card p-[22px]">
            <blockquote className="text-base leading-[1.6]">
              "It took eight months to find out it was her thyroid."
            </blockquote>
            <figcaption className="mt-2.5 text-13 font-bold uppercase tracking-[0.08em] text-link">
              Parent
            </figcaption>
          </figure>
          <div className="rounded-card bg-coral p-[22px]">
            <p className="text-base leading-[1.6] text-coral-ink">
              <strong>A change in health deserves a real look</strong> — not an assumption.
              That's the whole premise behind our tools.
            </p>
          </div>
        </aside>
      </section>
    </div>
  );
}
