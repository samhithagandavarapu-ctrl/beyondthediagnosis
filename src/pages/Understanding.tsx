export default function Understanding() {
  return (
    <div className="btd-container py-10 max-w-2xl">
      <p className="uppercase tracking-widest text-xs font-semibold text-gold-dark mb-3">
        Learn
      </p>
      <h1 className="text-3xl font-display font-semibold mb-2">
        Understanding Diagnostic Overshadowing
      </h1>
      <p className="text-slate mb-8 leading-relaxed">
        A plain-language guide to the pattern this whole platform exists to fight —
        drawn from clinical sources at the Adult Down Syndrome Center and CARE Down
        Syndrome, an initiative of the National Down Syndrome Society.
      </p>

      <section className="mb-8">
        <h2 className="text-xl font-display font-semibold mb-2">What it is</h2>
        <p className="text-sm text-ink leading-relaxed mb-3">
          Diagnostic overshadowing happens when a healthcare provider explains a new or
          worsening symptom by pointing to a diagnosis the person already has — Down
          syndrome — instead of investigating it as its own, possibly unrelated,
          medical issue. The Joint Commission's own definition centers on exactly this:
          symptoms get credited to an existing diagnosis rather than checked as a
          possible separate condition. The idea dates back to research from the early
          1980s, originally describing how symptoms in people with intellectual
          disabilities got wrongly folded into that diagnosis instead of being
          recognized as a distinct psychological or psychiatric issue.
        </p>
        <p className="text-sm text-ink leading-relaxed">
          It isn't unique to Down syndrome — the same pattern shows up in care for
          people with other intellectual and developmental disabilities, mental
          illness, and movement disorders. But because Down syndrome is so
          recognizable, it's an especially easy target for the shortcut.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-display font-semibold mb-2">A real example</h2>
        <p className="text-sm text-ink leading-relaxed">
          Dr. Brian Chicoine, founder of the Adult Down Syndrome Center, describes one
          of his earliest cases: a mother called about her adult son's three-week
          cough. Two different providers had already told her it was "just Down
          syndrome." When Chicoine's team actually examined him and ordered a chest
          X-ray, the cause was pneumonia — a common, treatable infection that had
          nothing to do with his chromosomes. The cough cleared up with standard
          antibiotics. Nothing about that case was unusual except that, twice, no one
          had looked.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-display font-semibold mb-2">
          Why it happens — three cognitive biases
        </h2>
        <p className="text-sm text-ink leading-relaxed mb-3">
          CARE Down Syndrome's clinical training material points to specific,
          well-documented thinking patterns that make overshadowing more likely, even
          among experienced clinicians:
        </p>
        <ul className="space-y-2 text-sm text-ink">
          <li className="border-l-2 border-gold pl-3">
            <strong>Anchoring bias</strong> — latching onto one piece of information
            (the Down syndrome diagnosis) and letting it dominate the whole assessment.
          </li>
          <li className="border-l-2 border-gold pl-3">
            <strong>Premature closure</strong> — stopping the workup before all the
            relevant information has actually been gathered.
          </li>
          <li className="border-l-2 border-gold pl-3">
            <strong>Implicit bias</strong> — unconscious assumptions about a patient
            that quietly shape a provider's judgment without them noticing.
          </li>
        </ul>
        <p className="text-sm text-slate-light mt-3">
          Notably, research cited by CARE Down Syndrome found the clinicians most prone
          to this bias were split between the least and the most experienced —
          seasoned providers aren't automatically protected from it.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-display font-semibold mb-2">
          Where it shows up most
        </h2>
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-sm text-ink mb-1">Mental and behavioral health</h3>
            <p className="text-sm text-slate leading-relaxed">
              When someone can't easily describe a physical symptom in words, it often
              comes out as a behavior change instead — and that change gets treated as
              "just how they are" rather than a sign something physical needs looking
              into.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-sm text-ink mb-1">Alzheimer's disease</h3>
            <p className="text-sm text-slate leading-relaxed">
              People with Down syndrome do face a higher risk of Alzheimer's, and at a
              younger age than the general population — but true symptoms are rare
              before 40. Cognitive or skill changes in younger adults are still often
              assumed to be Alzheimer's by default, when the real cause may be
              something else entirely, including conditions that are treatable or even
              reversible.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-sm text-ink mb-1">
              Physical differences treated as unchangeable
            </h3>
            <p className="text-sm text-slate leading-relaxed">
              Some features associated with Down syndrome — like differences in immune
              or kidney function — get treated as fixed facts rather than things that
              can be actively managed. Something as simple as consistent hydration can
              meaningfully offset reduced kidney function, for example, but that only
              happens if a provider treats it as worth managing rather than inevitable.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-sm text-ink mb-1">Autism</h3>
            <p className="text-sm text-slate leading-relaxed">
              Autism is more common among people with Down syndrome than in the general
              population, but overlapping traits between the two can make it get missed
              — delaying access to therapies that could genuinely help.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-sm text-ink mb-1">
              Even after death
            </h3>
            <p className="text-sm text-slate leading-relaxed">
              Research on death certificates has found this pattern extends further
              than most people realize: when Down syndrome is present, it's more likely
              to be listed as the cause of death by itself, with less investigation
              into other contributing factors than would happen for someone without an
              intellectual disability.
            </p>
          </div>
        </div>
      </section>

      <section className="mb-10 btd-card p-6 bg-sage/5 border-sage/30">
        <h2 className="text-lg font-display font-semibold mb-2">The bottom line</h2>
        <p className="text-sm text-ink leading-relaxed">
          A change in health deserves a real look — not an assumption. That's the
          entire premise behind Verity's Appointment Prep Tool and AI Advocacy
          Assistant: giving people the language and documentation to make sure a new
          symptom gets investigated on its own terms, not waved off as "just Down
          syndrome."
        </p>
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-light mb-3">
          Sources
        </h2>
        <ul className="space-y-2 text-sm">
          <li>
            <a
              href="https://adultdownsyndrome.org/resources/diagnostic-overshadowing/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gold-dark font-semibold hover:underline"
            >
              "Diagnostic Overshadowing" — Brian Chicoine, MD, Adult Down Syndrome Center ↗
            </a>
          </li>
          <li>
            <a
              href="https://careds.org/article/diagnostic-overshadowing/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gold-dark font-semibold hover:underline"
            >
              "Avoiding Diagnostic Overshadowing when Caring for Adults with Down Syndrome" — CARE Down Syndrome (NDSS) ↗
            </a>
          </li>
          <li>
            <a
              href="https://www.ncdsalliance.org/healthcareinformation/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gold-dark font-semibold hover:underline"
            >
              Healthcare Information for Families & Caregivers — NC Down Syndrome Alliance ↗
            </a>
          </li>
        </ul>
      </section>
    </div>
  );
}
