const modules = [
  {
    title: "Recognizing diagnostic overshadowing",
    desc: "How the bias shows up in practice, with real clinical patterns — from behavioral symptoms mistaken for 'just DS functioning' to age-of-onset mistakes with conditions like Alzheimer's.",
    price: "$20 / learner",
  },
  {
    title: "Inclusive communication for intellectual disability",
    desc: "Addressing the patient directly, adapting communication style without infantilizing, and involving caregivers appropriately rather than exclusively.",
    price: "$20 / learner",
  },
  {
    title: "Pain and symptom assessment across the lifespan",
    desc: "Why pain is under-recognized in patients with intellectual disabilities, and practical adjustments to standard assessment tools.",
    price: "$25 / learner",
  },
  {
    title: "Full certificate track",
    desc: "All modules plus a capstone case-review session, for residency programs and hospital systems.",
    price: "$150 / learner",
  },
];

export default function ProviderEducation() {
  return (
    <div className="btd-container py-10 max-w-3xl">
      <h1 className="text-3xl font-display font-semibold mb-2">Provider Education Hub</h1>
      <p className="text-slate mb-8">
        This problem doesn't get solved by families alone — providers need better tools
        too. Training built specifically on diagnostic overshadowing and inclusive care
        for patients with Down syndrome, informed directly by specialists and families.
      </p>

      <div className="space-y-4">
        {modules.map((m) => (
          <div key={m.title} className="btd-card p-5 flex items-start justify-between gap-4">
            <div>
              <h3 className="font-display font-semibold text-lg mb-1">{m.title}</h3>
              <p className="text-sm text-slate leading-relaxed">{m.desc}</p>
            </div>
            <span className="shrink-0 text-sm font-semibold text-gold-dark whitespace-nowrap">
              {m.price}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-10 btd-card p-6 bg-sage/5 border-sage/30">
        <h2 className="font-display font-semibold text-lg mb-2">
          For hospitals and residency programs
        </h2>
        <p className="text-sm text-slate leading-relaxed">
          Interested in licensing the Provider Education Hub for your staff or trainees?
          This is a direct revenue line alongside nonprofit licensing and grant funding —
          reach out to discuss a pilot.
        </p>
      </div>
    </div>
  );
}
