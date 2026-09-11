import { Link } from "react-router-dom";
import PageHero from "../components/PageHero";

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
    featured: true,
  },
];

export default function ProviderEducation() {
  return (
    <div>
      <PageHero
        tone="navy"
        eyebrow="For providers"
        title="Provider Education Hub"
        lede="This problem doesn't get solved by families alone. Training built specifically on diagnostic overshadowing and inclusive care for patients with Down syndrome — informed directly by specialists and families."
      />
      <section className="btd-container pt-12 pb-20 grid gap-5">
        <div className="flex gap-3.5 items-start rounded-card bg-coral px-6 py-5">
          <span className="flex-none whitespace-nowrap text-base font-extrabold text-coral-ink">
            Not active yet
          </span>
          <p className="text-base leading-[1.6] text-coral-ink">
            Pricing and enrollment below are planned offerings, not a live purchase system.
            No payments are being processed on this page.
          </p>
        </div>

        {modules.map((m) => (
          <article
            key={m.title}
            className={`rounded-card p-[26px] flex flex-wrap gap-[18px] justify-between items-start ${
              m.featured ? "bg-sky" : "btd-card"
            }`}
          >
            <div className="max-w-[44em]">
              <h2 className="mb-2 text-23 font-bold">{m.title}</h2>
              <p className={`text-15 leading-[1.7] ${m.featured ? "text-sky-ink" : "text-body"}`}>
                {m.desc}
              </p>
            </div>
            <span
              className={`rounded-full px-3.5 py-[9px] text-17 font-bold whitespace-nowrap ${
                m.featured ? "bg-white" : "bg-butter"
              }`}
            >
              {m.price}
            </span>
          </article>
        ))}

        <div className="btd-dark rounded-card p-[30px]">
          <h2 className="mb-2 text-26 font-extrabold">For hospitals and residency programs</h2>
          <p className="mb-[18px] max-w-[44em] text-base leading-[1.7] text-mist/85">
            Interested in licensing the Provider Education Hub for your staff or trainees?
            This is a direct revenue line alongside nonprofit licensing and grant funding —
            reach out to discuss a pilot.
          </p>
          <Link to="/future" className="btd-btn-coral min-h-[50px] px-6 py-[15px] text-base">
            Talk about a pilot →
          </Link>
        </div>
      </section>
    </div>
  );
}
