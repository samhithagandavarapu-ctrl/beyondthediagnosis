import { Link } from "react-router-dom";
import PageHero from "../components/PageHero";

const plans = [
  {
    tag: "In design",
    tagBg: "bg-coral",
    title: "Billing & insurance navigation",
    desc: "The second half of an advocacy fight is usually paperwork. This module reads the paperwork with you.",
    items: [
      "Plain-language explanation of an EOB or denial letter",
      "Appeal templates with medical-necessity language",
      "A running record of claims, calls, and reference numbers",
      "What to ask a case manager, in order",
    ],
  },
  {
    tag: "Next up",
    tagBg: "bg-butter",
    title: "Provider directory",
    desc: "Very few clinics are built for adults with Down syndrome. The directory starts with the ones that are, then grows through community verification.",
    items: [
      "Search by specialty, distance, and life stage",
      "Flags for clinicians who've completed the education modules",
      "Family-submitted notes, moderated before publishing",
    ],
  },
];

export default function Future() {
  return (
    <div>
      <PageHero
        eyebrow="Future work"
        title="The roadmap, and who pays for it"
        lede="Nothing on this page is live yet. It's here so families and funders can see exactly what's next — and why the tools families use will never sit behind a paywall."
      />
      <section className="btd-container pt-12">
        <div className="flex gap-3.5 items-start rounded-card bg-coral px-6 py-5">
          <span className="flex-none whitespace-nowrap text-base font-extrabold text-coral-ink">
            Heads up
          </span>
          <p className="text-base leading-[1.6] text-coral-ink">
            Everything below is a planned offering, not a live product. No payments are
            being processed anywhere on this site right now.
          </p>
        </div>
      </section>
      <section className="btd-container pt-10 pb-20 grid gap-5 grid-cols-[repeat(auto-fit,minmax(min(100%,320px),1fr))]">
        {plans.map((p) => (
          <article key={p.title} className="btd-card p-7">
            <span className={`btd-tag ${p.tagBg}`}>{p.tag}</span>
            <h2 className="mt-3.5 mb-2 text-26 font-extrabold">{p.title}</h2>
            <p className="mb-3.5 text-base leading-[1.7] text-body">{p.desc}</p>
            <ul className="list-disc pl-5 grid gap-1.5 text-15 leading-[1.7] text-body">
              {p.items.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
          </article>
        ))}
        <article className="btd-dark rounded-card p-7">
          <span className="btd-tag bg-sky">How it's funded</span>
          <h2 className="mt-3.5 mb-2 text-26 font-extrabold">Institutions pay. Families don't.</h2>
          <p className="mb-3.5 text-base leading-[1.7] text-mist/85">
            Revenue comes from the systems around families — provider training, nonprofit
            licensing, and grants. That's a mission choice and a business one.
          </p>
          <Link
            to="/provider-education"
            className="btd-btn min-h-[46px] bg-butter px-5 py-[13px] text-15 hover:bg-butter/85"
          >
            See provider pricing →
          </Link>
        </article>
      </section>
    </div>
  );
}
