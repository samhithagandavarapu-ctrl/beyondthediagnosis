import PageHero from "../components/PageHero";

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
        <h2 className="text-lg font-bold text-muted">Planned modules</h2>

        {modules.map((m) => (
          <article key={m.title} className="btd-card p-[26px]">
            <div className="max-w-[44em]">
              <h3 className="mb-2 text-23 font-bold">{m.title}</h3>
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
            href="mailto:info.verityhealth@gmail.com?subject=Provider%20Education%20pilot"
            className="btd-btn-coral min-h-[50px] px-6 py-[15px] text-base"
          >
            Talk about a pilot →
          </a>
        </div>
      </section>
    </div>
  );
}
